import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwtAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const prisma = getPrisma() as any;
        const cart = await prisma.cart.findFirst({ where: { userId: user.id }, include: { items: true } });
        if (!cart) return NextResponse.json({ items: [] });

        // parse JSON ingredients before return
        const items = (cart.items ?? []).map((it: any) => ({
            id: it.id,
            menuItemId: it.menuItemId,
            name: it.name,
            clientItemId: it.clientItemId ?? undefined,
            ingredients: typeof it.ingredients === "string" ? JSON.parse(it.ingredients) : it.ingredients ?? undefined,
            quantity: it.quantity,
            price: it.price,
            addedAt: it.addedAt,
        }));

        return NextResponse.json({ items });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("GET /api/cart error", msg);
        return NextResponse.json({ error: "Server error", detail: msg }, { status: 500 });
    }
}
