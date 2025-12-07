import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import {
    getUserFromRequest,
    refreshAccessToken,
    ACCESS_TOKEN_NAME,
    ACCESS_TTL_SEC,
} from "@/lib/jwtAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        let user = await getUserFromRequest(req);
        // If access token expired, try to refresh using refresh token and continue
        let cookieResponse: NextResponse | null = null;
        if (!user) {
            const refreshed = await refreshAccessToken(req);
            if (refreshed?.user && refreshed.access) {
                user = refreshed.user;
                // Prepare a response that sets refreshed access cookie
                cookieResponse = NextResponse.next();
                const cookieSecureEnv = process.env.COOKIE_SECURE?.toLowerCase();
                const cookieSecure =
                    cookieSecureEnv === "true"
                        ? true
                        : cookieSecureEnv === "false"
                            ? false
                            : process.env.NODE_ENV === "production";
                const base = {
                    httpOnly: true,
                    sameSite: "lax" as const,
                    path: "/",
                    secure: cookieSecure,
                };
                cookieResponse.cookies.set(ACCESS_TOKEN_NAME, refreshed.access, {
                    ...base,
                    maxAge: ACCESS_TTL_SEC,
                });
            }
        }
        if (!user)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const prisma = getPrisma() as any;
        const url = new URL(req.url);
        const fast = url.searchParams.get("fast") === "1";
        const refresh = url.searchParams.get("refresh") === "1";

        // Tiny per-user cache to reduce DB load and speed up UI
        const r = getRedis();
        const cacheKey = r ? `orders:view:${user.id}` : null;
        if (r && cacheKey && !refresh) {
            try {
                const cached = await r.get(cacheKey);
                if (cached) {
                    const resJson = NextResponse.json(JSON.parse(cached));
                    if (cookieResponse) {
                        const setCookies = (cookieResponse.headers.get("set-cookie") || "")
                            .split(",")
                            .filter(Boolean);
                        for (const sc of setCookies)
                            resJson.headers.append("set-cookie", sc);
                    }
                    return resJson;
                }
            } catch {
                /* ignore cache errors */
            }
        }

        const cart = await prisma.cart.findFirst({
            where: { userId: user.id },
            include: { items: true },
        });
        const rawItems = cart?.items ?? [];
        // enrich with menu item media (logoUrl) for thumbnails
        const menuIds: string[] = Array.from(
            new Set(rawItems.map((it: any) => it.menuItemId as string)),
        ).filter((id): id is string => typeof id === "string" && id !== "");
        const menuMap: Record<string, { logoUrl?: string | null }> = {};
        if (menuIds.length > 0) {
            const menuRows = await prisma.menuItem.findMany({
                where: { id: { in: menuIds } },
                select: { id: true, logoUrl: true },
            });
            for (const m of menuRows) menuMap[m.id] = { logoUrl: m.logoUrl };
        }
        const items = rawItems.map((it: any) => ({
            id: it.id,
            menuItemId: it.menuItemId,
            name: it.name,
            clientItemId: it.clientItemId ?? undefined,
            ingredients:
                typeof it.ingredients === "string"
                    ? JSON.parse(it.ingredients)
                    : (it.ingredients ?? undefined),
            quantity: it.quantity,
            price: it.price,
            addedAt: it.addedAt,
            logoUrl: menuMap[it.menuItemId]?.logoUrl ?? undefined,
        }));

        const reservations = await prisma.reservation.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
        });
        // join restaurant names
        const restIds = Array.from(
            new Set(
                (reservations ?? []).map((r: any) => r.restaurantId).filter(Boolean),
            ),
        );
        const restMap: Record<string, { name: string; logoUrl?: string | null }> =
            {};
        if (restIds.length > 0) {
            const rows = await prisma.restaurant.findMany({
                where: { id: { in: restIds } },
                select: { id: true, name: true, logoUrl: true },
            });
            for (const r of rows)
                restMap[r.id] = { name: r.name, logoUrl: r.logoUrl } as any;
        }
        const mappedReservations = (reservations ?? []).map((r: any) => {
            let tableBreakdown: Record<string, number> | undefined = undefined;
            let tablesCount: number | undefined = undefined;
            let noteText: string | undefined = undefined;
            let paid: boolean | undefined = undefined;
            if (typeof r.note === "string") {
                try {
                    const parsed = JSON.parse(r.note);
                    if (parsed && typeof parsed === "object") {
                        if (parsed.tableBreakdown) tableBreakdown = parsed.tableBreakdown;
                        if (typeof parsed.tablesCount === "number")
                            tablesCount = parsed.tablesCount;
                        if (typeof parsed.noteText === "string") noteText = parsed.noteText;
                        if (typeof parsed.paid === "boolean") paid = parsed.paid;
                    } else {
                        noteText = r.note;
                    }
                } catch (e) {
                    // not JSON, treat as plain text
                    noteText = r.note;
                }
            }
            return {
                id: r.id,
                restaurantId: r.restaurantId,
                restaurantName: restMap[r.restaurantId]?.name ?? undefined,
                logoUrl: restMap[r.restaurantId]?.logoUrl ?? undefined,
                fromDate: r.fromDate ? new Date(r.fromDate).toISOString() : undefined,
                toDate: r.toDate ? new Date(r.toDate).toISOString() : undefined,
                partySize: r.partySize ?? undefined,
                note: noteText ?? undefined,
                tableBreakdown,
                tablesCount,
                paid,
                createdAt: r.createdAt
                    ? new Date(r.createdAt).toISOString()
                    : undefined,
            };
        });

        const body: any = { items, reservations: mappedReservations };
        // Also include recent orders placed by this user (so paid/checked-out items stay visible)
        // Always include a short history, even in fast mode, so paid items persist in UI.
        {
            try {
                const recent = await prisma.order.findMany({
                    where: {
                        userId: user.id,
                        status: "paid",
                        createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) },
                    },
                    include: { items: true },
                    orderBy: { createdAt: "desc" },
                    take: 50,
                });
                if (recent && recent.length > 0) {
                    const orderItemsFlattened = [] as any[];
                    for (const o of recent) {
                        for (const it of o.items ?? []) {
                            orderItemsFlattened.push({
                                id: `orderitem:${it.id}`,
                                orderId: o.id,
                                menuItemId: it.menuItemId,
                                name: it.name,
                                ingredients: it.ingredients ?? undefined,
                                quantity: it.quantity,
                                price: it.price ?? null,
                                addedAt:
                                    (o as any).updatedAt?.toISOString?.() ||
                                    (o as any).updatedAt ||
                                    o.createdAt,
                                logoUrl: menuMap[it.menuItemId]?.logoUrl ?? undefined,
                                paid: true,
                                status: "paid",
                            });
                        }
                    }
                    body.items = [...orderItemsFlattened, ...body.items];
                }
            } catch {
                // ignore errors here
            }
        }
        // Include pending orders (recent) so items don't disappear during QR payment
        {
            try {
                const pend = await prisma.order.findMany({
                    where: {
                        userId: user.id,
                        status: "pending",
                        createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) },
                    },
                    include: { items: true },
                    orderBy: { createdAt: "desc" },
                    take: 50,
                });
                if (pend && pend.length > 0) {
                    body.pendingOrders = pend.map((o: any) => ({
                        id: o.id,
                        status: o.status,
                        createdAt: o.createdAt
                            ? new Date(o.createdAt).toISOString()
                            : undefined,
                        updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : undefined,
                        items: (o.items ?? []).map((it: any) => ({
                            id: `orderitem:${it.id}`,
                            menuItemId: it.menuItemId,
                            name: it.name,
                            quantity: it.quantity,
                            price: it.price ?? null,
                            logoUrl: menuMap[it.menuItemId]?.logoUrl ?? undefined,
                        })),
                    }));
                } else {
                    body.pendingOrders = [];
                }
            } catch {
                body.pendingOrders = [];
            }
        }
        // Store in cache with very short TTL
        try {
            // Long cache for fast GET; writers invalidate the key eagerly
            if (r && cacheKey)
                await r.set(cacheKey, JSON.stringify(body), "EX", 60 * 60 * 24 * 7);
        } catch {
            /* ignore */
        }
        if (cookieResponse) {
            // Return JSON while preserving cookies we just set
            const res = NextResponse.json(body);
            const setCookies = (cookieResponse.headers.get("set-cookie") || "")
                .split(",")
                .filter(Boolean);
            if (setCookies.length > 0) {
                // Append cookies (handles single cookie scenario reliably)
                for (const sc of setCookies) {
                    res.headers.append("set-cookie", sc);
                }
            }
            return res;
        }
        return NextResponse.json(body);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("GET /api/orders error", msg);
        return NextResponse.json(
            { error: "Server error", detail: msg },
            { status: 500 },
        );
    }
}
