import { NextResponse } from "next/server";
import { menuRepo } from "@/lib/menuRepo";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await menuRepo.list();
  return NextResponse.json({ items: rows });
}
