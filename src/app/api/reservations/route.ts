import { NextRequest, NextResponse } from "next/server";
import { reservationRepo } from "@/lib/reservationRepo";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { restaurantId, fromDate, toDate, partySize, note, userId } =
    body || {};
  if (!restaurantId || !fromDate) {
    return NextResponse.json(
      { error: "restaurantId and fromDate are required" },
      { status: 400 },
    );
  }
  const dto = await reservationRepo.create({
    restaurantId,
    userId,
    fromDate: new Date(fromDate),
    toDate: toDate ? new Date(toDate) : undefined,
    partySize: typeof partySize === "number" ? partySize : undefined,
    note: typeof note === "string" ? note : undefined,
  });
  return NextResponse.json(dto, { status: 201 });
}
