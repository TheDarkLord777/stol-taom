import { NextResponse } from "next/server";
import { getMenuCacheInfo } from "@/lib/menuRepo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Protect this endpoint in production unless explicitly enabled.
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ADMIN_CACHE_STATUS_ENABLED !== "1"
  ) {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }

  try {
    const info = await getMenuCacheInfo();
    return NextResponse.json({ ok: true, info });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("/api/admin/cache/status error", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
