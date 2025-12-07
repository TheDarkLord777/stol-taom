import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma, resetPrisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function extractMenuIdFromUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    const parts = url.pathname.split("/").filter(Boolean);
    // parts like ["api","menu","<id>","ingredients"]
    const idx = parts.indexOf("ingredients");
    if (idx > 0) return parts[idx - 1];
  } catch {
    // ignore
  }
  return undefined;
}

/**
 * @swagger
 * /api/menu/{id}/ingredients:
 *   get:
 *     summary: Get ingredients for a menu item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of ingredients
 */
export async function GET(req: NextRequest) {
  const id = extractMenuIdFromUrl(req.url);
  if (!id)
    return NextResponse.json({ error: "Missing menu id" }, { status: 400 });
  try {
    // Dev-only: log the resolved DB host/port so we can debug connection issues without printing credentials
    if (process.env.NODE_ENV !== "production") {
      try {
        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl) {
          try {
            const parsed = new URL(dbUrl);
            // eslint-disable-next-line no-console
            console.info(
              "[debug] DATABASE_HOST=",
              parsed.hostname,
              "PORT=",
              parsed.port || "5432",
            );
          } catch {
            // not a full URL (some connection strings aren't parseable by URL), print a masked prefix
            // eslint-disable-next-line no-console
            console.info("[debug] DATABASE_URL_PREFIX=", dbUrl.slice(0, 40));
          }
        } else {
          // eslint-disable-next-line no-console
          console.info("[debug] DATABASE_URL not set in process.env");
        }
      } catch (err) {
        // ignore logging errors
      }
    }
    // In dev, it's possible the server started before .env.local existed and Prisma was
    // initialized with the wrong env. Force a reset here so the client is created with
    // the current process.env values (safe only in non-production).
    if (process.env.NODE_ENV !== "production") {
      try {
        resetPrisma();
      } catch (err) {
        // ignore reset errors
      }
    }
    const prisma = getPrisma();
    const r = getRedis();
    const ttlMs = Number(
      process.env.INGREDIENT_CACHE_TTL_MS ?? 24 * 60 * 60 * 1000,
    );
    // Stale-while-revalidate strategy:
    //  - If we have a cached Redis key -> return it immediately (HIT)
    //  - If the key's TTL is below refreshAheadMs -> trigger a background refresh (non-blocking)
    //  - If no key -> fetch from DB, write Redis and return (MISS)
    const refreshAheadMs = Number(
      process.env.INGREDIENT_CACHE_REFRESH_AHEAD_MS ?? 2 * 60 * 1000,
    );

    // helper: refresh the cached ingredients for id into redis
    async function refreshIngredientsToRedis(
      rClient: any,
      prismaClient: any,
      menuId: string,
      ttl: number,
    ) {
      try {
        const items = await prismaClient.ingredient.findMany({
          where: { menuItemId: menuId },
          orderBy: { createdAt: "asc" },
        });
        const verRaw2 = await rClient.get(`menu:ingredients:version:${menuId}`);
        const ver2 = verRaw2 ? Number(verRaw2) : 0;
        const redisKey2 = `menu:ingredients:v:${ver2}:id:${menuId}`;
        await rClient.set(redisKey2, JSON.stringify(items), "PX", ttl);
        // eslint-disable-next-line no-console
        console.info("[menuRepo:cache] refresh wrote redis", redisKey2);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[menuRepo:cache] refresh failed", err);
      }
    }

    // Try versioned redis cache first when available
    if (r) {
      try {
        const verRaw = await r.get(`menu:ingredients:version:${id}`);
        const ver = verRaw ? Number(verRaw) : 0;
        const redisKey = `menu:ingredients:v:${ver}:id:${id}`;
        const cached = await r.get(redisKey);
        if (cached) {
          // eslint-disable-next-line no-console
          console.info("[menuRepo:cache] HIT redis ingredients", redisKey);

          // If TTL is low, kick off a non-blocking refresh. Use a short lock to avoid stampede.
          try {
            const pttl = await r.pttl(redisKey); // ms remaining or -1/-2
            if (pttl >= 0 && pttl < refreshAheadMs) {
              // use a simple lock key to avoid multiple concurrent refreshers
              const lockKey = `menu:ingredients:refreshing:${id}`;
              const lockSet = await r.set(lockKey, "1", "PX", 60000, "NX");
              if (lockSet) {
                // don't await; run in background
                void (async () => {
                  try {
                    await refreshIngredientsToRedis(r, prisma, id, ttlMs);
                  } finally {
                    try {
                      await r.del(lockKey);
                    } catch {}
                  }
                })();
              }
            }
          } catch (err) {
            // ignore pttl/read errors
          }

          const parsed = JSON.parse(cached);
          return NextResponse.json(
            { ingredients: parsed },
            { headers: { "X-Cache": "HIT" } },
          );
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[menuRepo:cache] redis read error ingredients", err);
      }
    }

    // Cache miss -> fetch from DB and populate redis
    const items = await prisma.ingredient.findMany({
      where: { menuItemId: id },
      orderBy: { createdAt: "asc" },
    });
    if (r) {
      try {
        const verRaw = await r.get(`menu:ingredients:version:${id}`);
        const ver = verRaw ? Number(verRaw) : 0;
        const redisKey = `menu:ingredients:v:${ver}:id:${id}`;
        await r.set(redisKey, JSON.stringify(items), "PX", ttlMs);
        // eslint-disable-next-line no-console
        console.info("[menuRepo:cache] MISS db -> wrote redis", redisKey);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[menuRepo:cache] redis write error ingredients", err);
      }
    }

    return NextResponse.json(
      { ingredients: items },
      { headers: { "X-Cache": "MISS" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // log full error server-side
    console.error("GET /api/menu/[id]/ingredients error", e);
    // In dev, return the error message (helpful for debugging). Never leak in production.
    if (process.env.NODE_ENV !== "production") {
      const stack = e instanceof Error ? e.stack : undefined;
      return NextResponse.json(
        { error: "Server error", detail: msg, stack },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/menu/{id}/ingredients:
 *   post:
 *     summary: Replace ingredients for a menu item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     mandatory:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Updated list of ingredients
 */
export async function POST(req: NextRequest) {
  const id = extractMenuIdFromUrl(req.url);
  if (!id)
    return NextResponse.json({ error: "Missing menu id" }, { status: 400 });

  // Prevent destructive operations from being callable in production by default.
  // Allow when running in non-production (dev) or when DEV_ADMIN_ENABLED=true.
  const devAdminEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.DEV_ADMIN_ENABLED === "true";
  if (!devAdminEnabled) {
    return NextResponse.json(
      { error: "Dev admin disabled in production" },
      { status: 403 },
    );
  }

  try {
    const body = (await req.json()) as {
      ingredients?: Array<{ id?: string; name: string; mandatory?: boolean }>;
    };

    // validate menu item exists to avoid foreign key errors
    const prisma = getPrisma();
    const menuExists = await prisma.menuItem.findUnique({ where: { id } });
    if (!menuExists) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 },
      );
    }
    if (!body.ingredients) {
      return NextResponse.json(
        { error: "Missing ingredients in body" },
        { status: 400 },
      );
    }

    const ingredients = body.ingredients;

    // Replace existing ingredients for the menu item with the provided list
    await prisma.$transaction(async (tx) => {
      await tx.ingredient.deleteMany({ where: { menuItemId: id } });
      const createData = ingredients.map((ing) => ({
        name: ing.name,
        mandatory: Boolean(ing.mandatory),
        menuItemId: id,
      }));
      if (createData.length > 0) {
        await tx.ingredient.createMany({ data: createData });
      }
    });

    const updated = await prisma.ingredient.findMany({
      where: { menuItemId: id },
    });

    // bump redis version and write the updated ingredients under the new version
    const r = getRedis();
    if (r) {
      try {
        const newVer = await r.incr(`menu:ingredients:version:${id}`);
        const redisKey = `menu:ingredients:v:${newVer}:id:${id}`;
        const ttlMs = Number(
          process.env.INGREDIENT_CACHE_TTL_MS ?? 24 * 60 * 60 * 1000,
        );
        await r.set(redisKey, JSON.stringify(updated), "PX", ttlMs);
        // eslint-disable-next-line no-console
        console.info(
          "[menuRepo:cache] bumped ingredients version and wrote",
          redisKey,
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          "[menuRepo:cache] redis version bump error ingredients",
          err,
        );
      }
    }

    return NextResponse.json(
      { ingredients: updated, cacheInvalidated: true },
      { headers: { "X-Cache": "INVALIDATED" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("POST /api/menu/[id]/ingredients error", msg, e);
    return NextResponse.json(
      { error: "Server error", detail: msg },
      { status: 500 },
    );
  }
}
