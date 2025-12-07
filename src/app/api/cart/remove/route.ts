import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwtAuth";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { id?: string };
    if (!body?.id)
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    const prisma = getPrisma() as any;
    // Find the item and ensure it belongs to any cart owned by this user
    const existing = await prisma.cartItem.findUnique({
      where: { id: body.id },
      include: { cart: true },
    });
    if (!existing || !existing.cart || existing.cart.userId !== user.id) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await prisma.cartItem.delete({ where: { id: body.id } });
    // Invalidate per-user orders cache so UI sees removal immediately
    try {
      const r = getRedis();
      if (r) await r.del(`orders:view:${user.id}`);
    } catch {}
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("DELETE /api/cart/remove error", msg);
    return NextResponse.json(
      { error: "Server error", detail: msg },
      { status: 500 },
    );
  }
}
