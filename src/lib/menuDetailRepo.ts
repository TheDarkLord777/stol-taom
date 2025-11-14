import { getPrisma } from "./prisma";
import { getRedis } from "./redis";
import { logger } from "./logger";

export type MenuItemDetail = {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    description?: string;
    ingredients: Array<{
        id: string;
        name: string;
        mandatory: boolean;
    }>;
    restaurants: Array<{
        id: string;
        name: string;
    }>;
};

/**
 * In-memory cache for menu item details
 * Key: menuItemId, Value: { data, timestamp }
 */
const detailCache = new Map<string, { value: MenuItemDetail | null; ts: number }>();

export const menuDetailRepo = {
    /**
     * Get menu item detail with Redis + memory caching
     * Strategy:
     * - Check memory cache first (fastest)
     * - Fall back to Redis
     * - Finally query database and refresh all caches
     */
    async getById(id: string): Promise<MenuItemDetail | null> {
        const ttlMs = Number(process.env.MENU_DETAIL_CACHE_TTL_MS ?? 24 * 60 * 60 * 1000); // 1 day default

        // Check memory cache first
        const cached = detailCache.get(id);
        if (cached && Date.now() - cached.ts < ttlMs) {
            logger.info("[menuDetailRepo:cache] HIT memory", { id });
            return cached.value;
        }

        // Check Redis
        const r = getRedis();
        if (r) {
            try {
                const redisKey = `menu:detail:${id}`;
                const cached = await r.get(redisKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    logger.info("[menuDetailRepo:cache] HIT redis", { id });
                    // Update memory cache
                    detailCache.set(id, { value: parsed, ts: Date.now() });
                    return parsed;
                }
            } catch (err) {
                logger.warn("[menuDetailRepo:cache] Redis error", { id, err });
            }
        }

        // Query database
        logger.info("[menuDetailRepo:cache] MISS - querying database", { id });
        try {
            const prisma = getPrisma();
            const row = await prisma.menuItem.findUnique({
                where: { id },
                include: {
                    ingredients: true,
                    restaurants: { include: { restaurant: true } },
                },
            });

            if (!row) {
                logger.info("[menuDetailRepo] not found", { id });
                return null;
            }

            const result: MenuItemDetail = {
                id: row.id,
                name: row.name,
                slug: row.slug,
                logoUrl: row.logoUrl ?? undefined,
                description: (row as any).description ?? undefined,
                ingredients: (row.ingredients ?? []).map((i) => ({
                    id: String(i.id),
                    name: i.name,
                    mandatory: i.mandatory,
                })),
                restaurants: (row.restaurants ?? []).map((r) => ({
                    id: r.restaurant.id,
                    name: r.restaurant.name,
                })),
            };

            // Cache in memory
            detailCache.set(id, { value: result, ts: Date.now() });

            // Cache in Redis
            if (r) {
                try {
                    const redisKey = `menu:detail:${id}`;
                    await r.set(redisKey, JSON.stringify(result), "PX", ttlMs);
                    logger.info("[menuDetailRepo:cache] cached to redis", { id, key: redisKey });
                } catch (err) {
                    logger.warn("[menuDetailRepo:cache] Redis set error", { id, err });
                }
            }

            return result;
        } catch (err) {
            logger.error("[menuDetailRepo] database error", { id, err });
            return null;
        }
    },

    /**
     * Invalidate cache for a specific menu item
     * Called when menu item is updated or deleted
     */
    async invalidateCache(id: string): Promise<void> {
        try {
            // Remove from memory cache
            detailCache.delete(id);
            logger.info("[menuDetailRepo:cache] invalidated memory", { id });

            // Remove from Redis
            const r = getRedis();
            if (r) {
                const redisKey = `menu:detail:${id}`;
                await r.del(redisKey);
                logger.info("[menuDetailRepo:cache] invalidated redis", { id, key: redisKey });
            }
        } catch (err) {
            logger.warn("[menuDetailRepo:cache] invalidate failed", { id, err });
        }
    },

    /**
     * Invalidate all menu item details (called when menu list changes)
     */
    async invalidateAll(): Promise<void> {
        try {
            // Clear memory cache
            detailCache.clear();
            logger.info("[menuDetailRepo:cache] cleared memory cache");

            // Clear Redis pattern
            const r = getRedis();
            if (r) {
                try {
                    const { listKeys } = await import("./redis");
                    const keys = await listKeys("menu:detail:*");
                    if (keys.length > 0) {
                        const { delKeys } = await import("./redis");
                        await delKeys(keys);
                        logger.info("[menuDetailRepo:cache] invalidated redis keys", { count: keys.length });
                    }
                } catch (err) {
                    logger.warn("[menuDetailRepo:cache] clear redis failed", err);
                }
            }
        } catch (err) {
            logger.warn("[menuDetailRepo:cache] invalidateAll failed", err);
        }
    },
};
