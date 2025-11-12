import { NextResponse } from "next/server";
import { restaurantRepo } from "@/lib/restaurantRepo";
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
    return NextResponse.json({ items: rows });
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
