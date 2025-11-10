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
        const items = (cart?.items ?? []).map((it: any) => ({
            id: it.id,
            menuItemId: it.menuItemId,
            name: it.name,
            clientItemId: it.clientItemId ?? undefined,
            ingredients: typeof it.ingredients === "string" ? JSON.parse(it.ingredients) : it.ingredients ?? undefined,
            quantity: it.quantity,
            price: it.price,
            addedAt: it.addedAt,
        }));

        const reservations = await prisma.reservation.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
        const mappedReservations = (reservations ?? []).map((r: any) => ({
            id: r.id,
            restaurantId: r.restaurantId,
            fromDate: r.fromDate ? new Date(r.fromDate).toISOString() : undefined,
            toDate: r.toDate ? new Date(r.toDate).toISOString() : undefined,
            partySize: r.partySize ?? undefined,
            note: r.note ?? undefined,
            createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
        }));

        return NextResponse.json({ items, reservations: mappedReservations });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("GET /api/orders error", msg);
        return NextResponse.json({ error: "Server error", detail: msg }, { status: 500 });
    }
}
