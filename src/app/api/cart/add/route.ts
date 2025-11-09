import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwtAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = (await req.json()) as {
            menuItemId: string;
            name: string;
            price?: string;
            ingredients?: Array<{ id?: string; name: string }> | string | null;
            quantity?: number;
            clientId?: string; // client-sent id for idempotency
        };
        if (!body?.menuItemId || !body?.name) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

        const prisma = getPrisma() as any;

        // Ensure user has a cart
        let cart = await prisma.cart.findFirst({ where: { userId: user.id } });
        if (!cart) {
            cart = await prisma.cart.create({ data: { userId: user.id } });
        }

        // If client provided a clientId, check for existing item to ensure idempotency
        if (body.clientId) {
            const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, clientItemId: body.clientId } });
            if (existing) {
                // return existing
                return NextResponse.json({ success: true, item: existing });
            }
        }

        const item = await prisma.cartItem.create({
            data: {
                cartId: cart.id,
                clientItemId: body.clientId ?? undefined,
                menuItemId: body.menuItemId,
                name: body.name,
                // store as native JSON when possible
                ingredients: typeof body.ingredients === "string" ? JSON.parse(body.ingredients) : body.ingredients ?? undefined,
                quantity: body.quantity ?? 1,
                price: body.price ?? undefined,
            },
        });

        return NextResponse.json({ success: true, item });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("POST /api/cart/add error", msg);
        return NextResponse.json({ error: "Server error", detail: msg }, { status: 500 });
    }
}
