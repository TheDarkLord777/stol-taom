import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

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
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const restaurantId = params.id;
  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  if (!restaurantId || !fromStr) {
    return NextResponse.json({ error: "restaurant id and from are required" }, { status: 400 });
  }
  try {
    const fromDate = new Date(fromStr);
    const toDate = toStr ? new Date(toStr) : new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "invalid from/to" }, { status: 400 });
    }
    // Simple capacity model: per size capacities
    const capacities: Record<string, number> = { "2": 5, "4": 5, "6": 5, "8": 5 };

    const prisma = getPrisma() as any;
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

    return NextResponse.json({ sizes });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("GET /api/restaurants/[id]/availability error", msg);
    return NextResponse.json({ error: "Server error", detail: msg }, { status: 500 });
  }
}


