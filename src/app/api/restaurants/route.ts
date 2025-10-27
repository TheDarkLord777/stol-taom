import { NextResponse } from "next/server";
import { restaurantRepo } from "@/lib/restaurantRepo";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await restaurantRepo.list();
  return NextResponse.json({ items: rows });
}
