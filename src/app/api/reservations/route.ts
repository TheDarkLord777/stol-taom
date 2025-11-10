import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { reservationRepo } from "@/lib/reservationRepo";
import { getUserFromRequest } from "@/lib/jwtAuth";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { restaurantId, fromDate, toDate, partySize, note } = body || {};
  // Attach authenticated user to ensure reservations show up in /orders
  const user = await getUserFromRequest(req).catch(() => null);
  if (!restaurantId || !fromDate) {
    return NextResponse.json(
      { error: "restaurantId and fromDate are required" },
      { status: 400 },
    );
  }
  // Server-side capacity guard to avoid double-booking using per-restaurant capacities
  const prisma = getPrisma() as any;
  // load per-restaurant capacity with fallback to defaults
  const capRow = await prisma.restaurantCapacity.findUnique({
    where: { restaurantId },
    select: { table2: true, table4: true, table6: true, table8: true },
  });
  const capacities: Record<2 | 4 | 6 | 8, number> = {
    2: capRow?.table2 ?? 5,
    4: capRow?.table4 ?? 5,
    6: capRow?.table6 ?? 5,
    8: capRow?.table8 ?? 5,
  };
  const requestedSize = (typeof partySize === "number" ? partySize : 2) as number;
  const bucket = requestedSize <= 2 ? 2 : requestedSize <= 4 ? 4 : requestedSize <= 6 ? 6 : 8;
  const from = new Date(fromDate);
  const to = toDate ? new Date(toDate) : new Date(from.getTime() + 60 * 60 * 1000); // default 1 hour

  try {
    // Count overlapping reservations for same restaurant and same size bucket
    const overlapping = await prisma.reservation.count({
      where: {
        restaurantId,
        AND: [
          { fromDate: { lt: to } },
          {
            OR: [
              { toDate: null },
              { toDate: { gt: from } },
            ],
          },
        ],
        // map partySize to buckets: 2,4,6,8
        OR: [
          { partySize: { lte: 2 } },
          { AND: [{ partySize: { gt: 2 } }, { partySize: { lte: 4 } }] },
          { AND: [{ partySize: { gt: 4 } }, { partySize: { lte: 6 } }] },
          { partySize: { gt: 6 } },
        ].slice(bucket === 2 ? 0 : bucket === 4 ? 1 : bucket === 6 ? 2 : 3, (bucket === 2 ? 1 : bucket === 4 ? 2 : bucket === 6 ? 3 : 4)),
      },
    });
    const capacity = capacities[bucket as 2 | 4 | 6 | 8];
    if (overlapping >= capacity) {
      return NextResponse.json({ error: "No availability for selected time and table size" }, { status: 409 });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Capacity check failed", msg);
    // proceed but log error
  }

  const dto = await reservationRepo.create({
    restaurantId,
    userId: user?.id,
    fromDate: new Date(fromDate),
    toDate: toDate ? new Date(toDate) : undefined,
    partySize: typeof partySize === "number" ? partySize : undefined,
    note: typeof note === "string" ? note : undefined,
  });
  return NextResponse.json(dto, { status: 201 });
}
