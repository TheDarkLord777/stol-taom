import { NextResponse } from "next/server";
import { menuRepo, getMenuLastCacheStatus } from "@/lib/menuRepo";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await menuRepo.list();

  // Respect MENU_CACHE_TTL_MS for CDN/edge caching when present. Use
  // a short browser max-age but allow CDNs (s-maxage) to cache longer.
  const ttlMs = Number(process.env.MENU_CACHE_TTL_MS ?? 3 * 24 * 60 * 60 * 1000);
  const sMaxAge = Math.max(0, Math.floor(ttlMs / 1000));
  const cacheControl = `public, max-age=60, s-maxage=${sMaxAge}, stale-while-revalidate=60`;

  // Add X-Cache header from menuRepo (best-effort per-process value)
  const cacheStatus = getMenuLastCacheStatus() ?? "MISS";
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
}
