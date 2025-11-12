import { dbTry } from "./dbTry";
import { prisma } from "./prisma";
import { getRedis } from "./redis";
import { setLastSync } from "./redis";

export type RestaurantDTO = {
  id: string;
  name: string;
  logoUrl?: string;
  createdAt: number;
};

export const restaurantRepo = {
  async list(): Promise<RestaurantDTO[]> {
    const rows = await dbTry(() =>
      prisma.restaurant.findMany({ orderBy: { name: "asc" } }),
    );
    return (
      rows as {
        id: string;
        name: string;
        logoUrl?: string | null;
        createdAt: Date;
      }[]
    ).map((r) => ({
      id: r.id,
      name: r.name,
      logoUrl: r.logoUrl ?? undefined,
      createdAt: r.createdAt.getTime(),
    }));
  },
  async upsert(data: {
    name: string;
    logoUrl?: string;
  }): Promise<RestaurantDTO> {
    const slugName = data.name.trim();
    const row = await dbTry(() =>
      prisma.restaurant.upsert({
        where: { name: slugName },
        update: { logoUrl: data.logoUrl ?? null },
        create: { name: slugName, logoUrl: data.logoUrl ?? null },
      }),
    );

    // Write-through: update redis so reads see the change immediately.
    const r = getRedis();
    if (r) {
      try {
        // bump version and write full restaurants list under the new version
        const newVer = await r.incr("menu:restaurants:version");
        const rows = await dbTry(() => prisma.restaurant.findMany({ orderBy: { name: "asc" } }));
        const payload = (rows as { id: string; name: string; logoUrl?: string | null; createdAt: Date }[]).map((r) => ({
          id: r.id,
          name: r.name,
          logoUrl: r.logoUrl ?? undefined,
          createdAt: r.createdAt.getTime(),
        }));
        const redisKey = `menu:restaurants:v:${newVer}`;
        const ttlMs = Number(process.env.MENU_CACHE_TTL_MS ?? 3 * 24 * 60 * 60 * 1000);
        await r.set(redisKey, JSON.stringify(payload), "PX", ttlMs);
        // eslint-disable-next-line no-console
        console.info("[restaurantRepo:cache] write-through wrote", redisKey);
        try {
          await setLastSync();
        } catch (err) {
          // non-fatal
          // eslint-disable-next-line no-console
          console.warn("[restaurantRepo:cache] setLastSync failed", err);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[restaurantRepo:cache] write-through error", err);
      }
    }
    return {
      id: row.id,
      name: row.name,
      logoUrl: row.logoUrl ?? undefined,
      createdAt: row.createdAt.getTime(),
    };
  },
};
