import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { menuDetailRepo } from "@/lib/menuDetailRepo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * @swagger
 * /api/menu/{id}:
 *   get:
 *     summary: Get full detail for a menu item (description, ingredients, restaurants)
 *     description: Cached endpoint - returns clean data with 1-day cache TTL
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu item detail with caching headers
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    // expected: ["api","menu","<id>"]
    const id = parts[2];
    if (!id)
      return NextResponse.json({ error: "Missing menu id" }, { status: 400 });

    // Get from cache (memory → Redis → database)
    const detail = await menuDetailRepo.getById(id);
    if (!detail)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Aggressive caching: 1 day in browser, longer on CDN
    const ttlMs = Number(
      process.env.MENU_DETAIL_CACHE_TTL_MS ?? 24 * 60 * 60 * 1000,
    );
    const sMaxAge = Math.max(0, Math.floor(ttlMs / 1000));
    const cacheControl = `public, max-age=3600, s-maxage=${sMaxAge}, stale-while-revalidate=60`;

    return NextResponse.json(
      { ...detail },
      {
        headers: {
          "Cache-Control": cacheControl,
        },
      },
    );
  } catch (e: unknown) {
    console.error("GET /api/menu/[id] error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
