import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Compute availability for a restaurant in a date or date-range.
 * Query:
 *  - from: ISO string (required)
 *  - to: ISO string (optional). If omitted, treated as single-day window [from, from+1d).
 * Response:
 *  {
 *    sizes: { "2": number, "4": number, "6": number, "8": number }
 *  }
 *
 * Assumptions:
 *  - Each restaurant has a simple capacity model: 5 tables per size (2,4,6,8).
 *  - Existing reservations overlapping [from, to] reduce availability based on their partySize -> mapped to closest size bucket.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: restaurantId } = await params;
  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");

  if (!restaurantId || !fromStr) {
    return NextResponse.json({ error: "restaurant id and from are required" }, { status: 400 });
  }
  try {
    // Try read-through cache first
    const redis = getRedis();
    const fromISO = new Date(fromStr).toISOString();
    const toISO = toStr ? new Date(toStr).toISOString() : new Date(new Date(fromStr).getTime() + 24 * 60 * 60 * 1000).toISOString();
    const cacheKey = `availability:${restaurantId}:from:${fromISO}:to:${toISO}`;
    const ttlMs = Number(process.env.AVAILABILITY_CACHE_TTL_MS ?? 10000);
    if (redis) {
      try {
        const raw = await redis.get(cacheKey);
        if (raw) {
          const payload = JSON.parse(raw);
          return NextResponse.json(payload, { headers: { "x-cache": "HIT" } });
        }
      } catch (err) {
        // swallow redis errors and continue to DB
        console.warn("redis get failed", err);
      }
    }
    const fromDate = new Date(fromStr);
    const toDate = toStr ? new Date(toStr) : new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "invalid from/to" }, { status: 400 });
    }
    const prisma = getPrisma() as any;

    // Per-restaurant capacity from DB (fallback to defaults if not set)
    const capRow = await prisma.restaurantCapacity.findUnique({
      where: { restaurantId },
      select: { table2: true, table4: true, table6: true, table8: true },
    });
    const capacities: Record<string, number> = {
      "2": capRow?.table2 ?? 5,
      "4": capRow?.table4 ?? 5,
      "6": capRow?.table6 ?? 5,
      "8": capRow?.table8 ?? 5,
    };

    // Find reservations overlapping [fromDate, toDate)
    const reservations = await prisma.reservation.findMany({
      where: {
        restaurantId,
        // overlap: from < toDate && (to == null ? fromDate <= row.fromDate : row.toDate > fromDate)
        AND: [
          { fromDate: { lt: toDate } },
          {
            OR: [
              { toDate: null },
              { toDate: { gt: fromDate } },
            ],
          },
        ],
      },
      select: { partySize: true },
    });

    const used: Record<string, number> = { "2": 0, "4": 0, "6": 0, "8": 0 };
    for (const r of reservations) {
      const size = Number(r.partySize || 2);
      // Map any party size to closest table size bucket
      const bucket = size <= 2 ? "2" : size <= 4 ? "4" : size <= 6 ? "6" : "8";
      used[bucket] += 1;
    }

    const sizes: Record<string, number> = Object.fromEntries(
      Object.keys(capacities).map((k) => [k, Math.max(0, (capacities as any)[k] - (used as any)[k])]),
    );

    // store in cache (best-effort)
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify({ sizes }), "PX", ttlMs);
      } catch (err) {
        console.warn("redis set failed", err);
      }
    }

    return NextResponse.json({ sizes }, { headers: { "x-cache": "MISS" } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("GET /api/restaurants/[id]/availability error", msg);
    return NextResponse.json({ error: "Server error", detail: msg }, { status: 500 });
  }
}


