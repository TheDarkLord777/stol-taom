import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwtAuth";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const restaurantId = url.searchParams.get("restaurantId");
    if (!restaurantId)
      return NextResponse.json(
        { error: "restaurantId required" },
        { status: 400 },
      );

    const user = await getUserFromRequest(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const prisma = getPrisma();
    // Check DB-backed manager mapping (RestaurantManager)
    try {
      const mgr = await prisma.restaurantManager.findFirst({
        where: { restaurantId, userId: user.id },
      });
      if (!mgr) {
        // Fallback to dev Redis owner mapping
        const r = getRedis();
        if (r) {
          const key = `dev:restaurant:owner:${restaurantId}`;
          const ownerPhone = await r.get(key);
          if (!ownerPhone || ownerPhone !== user.phone) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }
        } else {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    } catch (e) {
      // on DB error, deny
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch reservations (treat as "open orders") for this restaurant
    const resRows = await prisma.reservation.findMany({
      where: { restaurantId },
      include: { user: { select: { id: true, phone: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const reservations = resRows.map((r: any) => ({
      id: r.id,
      type: "reservation",
      restaurantId: r.restaurantId,
      user: r.user
        ? { id: r.user.id, name: r.user.name, phone: r.user.phone }
        : null,
      fromDate: r.fromDate ? new Date(r.fromDate).toISOString() : null,
      toDate: r.toDate ? new Date(r.toDate).toISOString() : null,
      partySize: r.partySize ?? null,
      note: r.note ?? null,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    }));

    // Fetch orders that have items for this restaurant
    // 1) OrderItems explicitly assigned to this restaurant
    const explicitRows = await prisma.orderItem.findMany({
      where: { restaurantId },
      select: { orderId: true },
    });
    const explicitOrderIds = explicitRows.map((o: any) => o.orderId);

    // 2) Fallback: some older OrderItems may have null restaurantId. Match those by menuItemId -> MenuItemOnRestaurant mapping.
    const menuLinks = await prisma.menuItemOnRestaurant.findMany({
      where: { restaurantId },
      select: { menuItemId: true },
    });
    const menuItemIds = menuLinks.map((m: any) => m.menuItemId);
    let fallbackOrderIds: string[] = [];
    if (menuItemIds.length > 0) {
      const fallbackRows = await prisma.orderItem.findMany({
        where: { restaurantId: null, menuItemId: { in: menuItemIds } },
        select: { orderId: true },
      });
      fallbackOrderIds = fallbackRows.map((o: any) => o.orderId);
    }

    const orderIds = Array.from(
      new Set([...explicitOrderIds, ...fallbackOrderIds]),
    ).slice(0, 200);
    let orders: any[] = [];
    if (orderIds.length > 0) {
      const orderRows = await prisma.order.findMany({
        where: { id: { in: orderIds } },
        include: { items: true, user: true },
        orderBy: { createdAt: "desc" },
      });
      const menuIdSet = new Set(menuItemIds || []);
      orders = orderRows
        .map((o: any) => ({
          id: o.id,
          type: "order",
          status: o.status,
          paymentMethod: o.paymentMethod,
          restaurantId: restaurantId,
          user: o.user
            ? { id: o.user.id, name: o.user.name, phone: o.user.phone }
            : null,
          items: o.items
            .filter(
              (it: any) =>
                it.restaurantId === restaurantId ||
                (it.restaurantId == null && menuIdSet.has(it.menuItemId)),
            )
            .map((it: any) => ({
              id: it.id,
              name: it.name,
              quantity: it.quantity,
              price: it.price,
            })),
          createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
        }))
        .filter((oo: any) => oo.items && oo.items.length > 0);
    }

    const items = [...reservations, ...orders]
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 200);

    return NextResponse.json({ items });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: msg },
      { status: 500 },
    );
  }
}
