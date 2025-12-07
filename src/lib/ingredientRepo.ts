import { dbTry } from "./dbTry";
import { prisma } from "./prisma";
import { getRedis } from "./redis";
import { logger } from "./logger";

export type IngredientDTO = {
  id: string;
  name: string;
  createdAt: number;
};

/**
 * In-memory cache for ingredients list
 */
let ingredientsCache = { value: null as IngredientDTO[] | null, ts: 0 };

export const ingredientRepo = {
  /**
   * List all ingredients with Redis + memory caching
   * Strategy:
   * - Check memory cache first (fast)
   * - Fall back to Redis (if available)
   * - Finally query database and refresh caches
   */
  async list(): Promise<IngredientDTO[]> {
    const ttlMs = Number(
      process.env.INGREDIENTS_CACHE_TTL_MS ?? 3 * 24 * 60 * 60 * 1000,
    ); // 3 days default

    // Check memory cache first
    if (ingredientsCache.value && Date.now() - ingredientsCache.ts < ttlMs) {
      logger.info("[ingredientRepo:cache] HIT memory");
      return ingredientsCache.value;
    }

    const r = getRedis();

    // Try Redis if available
    if (r) {
      try {
        const verRaw = await r.get("ingredients:version");
        const ver = verRaw ? Number(verRaw) : 0;
        const redisKey = `ingredients:v:${ver}`;
        const cached = await r.get(redisKey);
        if (cached) {
          const parsed = JSON.parse(cached) as IngredientDTO[];
          ingredientsCache.value = parsed;
          ingredientsCache.ts = Date.now();
          logger.info("[ingredientRepo:cache] HIT redis", { key: redisKey });
          return parsed;
        }
      } catch (err) {
        logger.warn("[ingredientRepo:cache] Redis read failed", err);
      }
    }

    // Cache miss — query database
    logger.info("[ingredientRepo:cache] MISS, querying database");
    const rows = await dbTry(() =>
      prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
    );

    const result = (
      rows as {
        id: string;
        name: string;
        createdAt: Date;
      }[]
    ).map((ing) => ({
      id: ing.id,
      name: ing.name,
      createdAt: ing.createdAt.getTime(),
    }));

    // Update caches
    ingredientsCache.value = result;
    ingredientsCache.ts = Date.now();

    if (r) {
      try {
        const verRaw = await r.get("ingredients:version");
        const ver = verRaw ? Number(verRaw) : 0;
        const redisKey = `ingredients:v:${ver}`;
        await r.set(redisKey, JSON.stringify(result), "PX", ttlMs);
        logger.info("[ingredientRepo:cache] cached to redis", {
          key: redisKey,
        });
      } catch (err) {
        logger.warn("[ingredientRepo:cache] Redis write failed", err);
      }
    }

    return result;
  },

  /**
   * Invalidate and refresh ingredient cache
   * (Called after any ingredient CREATE/UPDATE/DELETE operations)
   */
  async invalidateCache(): Promise<void> {
    const r = getRedis();
    if (!r) return;

    try {
      // Bump version
      const newVer = await r.incr("ingredients:version");
      logger.info("[ingredientRepo:cache] invalidated, new version", {
        ver: newVer,
      });

      // Refresh database and cache under new version
      const rows = await dbTry(() =>
        prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
      );

      const result = (
        rows as {
          id: string;
          name: string;
          createdAt: Date;
        }[]
      ).map((ing) => ({
        id: ing.id,
        name: ing.name,
        createdAt: ing.createdAt.getTime(),
      }));

      const redisKey = `ingredients:v:${newVer}`;
      const ttlMs = Number(
        process.env.INGREDIENTS_CACHE_TTL_MS ?? 3 * 24 * 60 * 60 * 1000,
      );
      await r.set(redisKey, JSON.stringify(result), "PX", ttlMs);

      // Update memory cache
      ingredientsCache.value = result;
      ingredientsCache.ts = Date.now();

      logger.info("[ingredientRepo:cache] refreshed", { key: redisKey });
    } catch (err) {
      logger.warn("[ingredientRepo:cache] invalidateCache failed", err);
    }
  },
};
