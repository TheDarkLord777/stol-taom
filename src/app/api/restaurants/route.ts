import { NextResponse } from "next/server";
import { restaurantRepo, getRestaurantLastCacheStatus } from "@/lib/restaurantRepo";
import { resetPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // In dev, ensure prisma client is recreated with current env (helps when .env.local was added after process start)
    if (process.env.NODE_ENV !== "production") {
      try {
        resetPrisma();
      } catch {
        // ignore
      }
    }

    const rows = await restaurantRepo.list();

    // Respect MENU_CACHE_TTL_MS for CDN/edge caching when present. Use
    // a short browser max-age but allow CDNs (s-maxage) to cache longer.
    const ttlMs = Number(process.env.MENU_CACHE_TTL_MS ?? 3 * 24 * 60 * 60 * 1000);
    const sMaxAge = Math.max(0, Math.floor(ttlMs / 1000));
    const cacheControl = `public, max-age=60, s-maxage=${sMaxAge}, stale-while-revalidate=60`;

    // Add cache status header
    const cacheStatus = getRestaurantLastCacheStatus() ?? "MISS";
    const xcache = cacheStatus.includes("HIT") ? "HIT" : "MISS";

    return NextResponse.json(
      { items: rows },
      {
        headers: {
          "Cache-Control": cacheControl,
          "X-Cache": xcache,
        },
      },
    );
  } catch (e: unknown) {
    // log server-side
    // eslint-disable-next-line no-console
    console.error("GET /api/restaurants error", e);
    if (process.env.NODE_ENV !== "production") {
      const msg = e instanceof Error ? e.message : String(e);
      const stack = e instanceof Error ? e.stack : undefined;
      return NextResponse.json({ error: "Server error", detail: msg, stack }, { status: 500 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
