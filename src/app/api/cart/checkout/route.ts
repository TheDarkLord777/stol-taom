import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwtAuth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const ids = Array.isArray(body?.ids) ? (body.ids as string[]) : undefined;

        const prisma = getPrisma() as any;

        // load cart for user
        const cart = await prisma.cart.findFirst({ where: { userId: user.id }, include: { items: true } });
        const rawItems = (cart?.items ?? []) as any[];
        const toCheckout = ids && ids.length > 0 ? rawItems.filter((it) => ids.includes(it.id)) : rawItems;
        if (!toCheckout || toCheckout.length === 0) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

        // Build order items and try to infer restaurantId from MenuItemOnRestaurant
        const orderItemsData = [] as any[];
        for (const it of toCheckout) {
            // Prefer the restaurantId stored on the cart item (set when item was added)
            let restaurantId: string | null = it.restaurantId ?? null;
            if (!restaurantId) {
                try {
                    const link = await prisma.menuItemOnRestaurant.findFirst({ where: { menuItemId: it.menuItemId }, select: { restaurantId: true } });
                    if (link?.restaurantId) restaurantId = link.restaurantId;
                } catch { }
            }
            orderItemsData.push({
                menuItemId: it.menuItemId,
                name: it.name,
                ingredients: typeof it.ingredients === 'string' ? JSON.parse(it.ingredients) : it.ingredients ?? null,
                quantity: it.quantity,
                price: it.price ?? null,
                restaurantId,
            });
        }

        // create order and order items in transaction, then remove cart items
        const result = await prisma.$transaction(async (tx: any) => {
            const created = await tx.order.create({ data: { userId: user.id, status: 'pending', paymentMethod: body?.paymentMethod ?? 'counter' } });
            for (const oi of orderItemsData) {
                await tx.orderItem.create({ data: { orderId: created.id, restaurantId: oi.restaurantId, menuItemId: oi.menuItemId, name: oi.name, ingredients: oi.ingredients, quantity: oi.quantity, price: oi.price } });
            }
            // delete checked out cart items
            const itemIds = toCheckout.map((x) => x.id);
            if (itemIds.length > 0) await tx.cartItem.deleteMany({ where: { id: { in: itemIds } } });
            return created;
        });

        // notify via BroadcastChannel (best-effort) so same-browser tabs update
        try {
            const bc = new BroadcastChannel('orders');
            bc.postMessage({ type: 'orders:update' });
            bc.close();
        } catch { }

        return NextResponse.json({ id: result.id, status: result.status }, { status: 201 });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('POST /api/cart/checkout error', msg);
        return NextResponse.json({ error: 'Server error', detail: msg }, { status: 500 });
    }
}
