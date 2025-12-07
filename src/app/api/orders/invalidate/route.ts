import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwtAuth";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const r = getRedis();
    if (!r)
      return NextResponse.json({ error: "Redis disabled" }, { status: 500 });
    const key = `orders:view:${user.id}`;
    try {
      await r.del(key);
    } catch {}
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: msg },
      { status: 500 },
    );
  }
}
