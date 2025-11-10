import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserFromRequest, refreshAccessToken, ACCESS_TOKEN_NAME, ACCESS_TTL_SEC } from "@/lib/jwtAuth";

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
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const prisma = getPrisma() as any;

        const cart = await prisma.cart.findFirst({ where: { userId: user.id }, include: { items: true } });
        const rawItems = (cart?.items ?? []);
        // enrich with menu item media (logoUrl) for thumbnails
        const menuIds: string[] = Array.from(new Set(rawItems.map((it: any) => it.menuItemId))).filter(Boolean);
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
            ingredients: typeof it.ingredients === "string" ? JSON.parse(it.ingredients) : it.ingredients ?? undefined,
            quantity: it.quantity,
            price: it.price,
            addedAt: it.addedAt,
            logoUrl: menuMap[it.menuItemId]?.logoUrl ?? undefined,
        }));

        const reservations = await prisma.reservation.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
        // join restaurant names
        const restIds = Array.from(new Set((reservations ?? []).map((r: any) => r.restaurantId).filter(Boolean)));
        const restMap: Record<string, { name: string }> = {};
        if (restIds.length > 0) {
            const rows = await prisma.restaurant.findMany({ where: { id: { in: restIds } }, select: { id: true, name: true } });
            for (const r of rows) restMap[r.id] = { name: r.name };
        }
        const mappedReservations = (reservations ?? []).map((r: any) => ({
            id: r.id,
            restaurantId: r.restaurantId,
            restaurantName: restMap[r.restaurantId]?.name ?? undefined,
            fromDate: r.fromDate ? new Date(r.fromDate).toISOString() : undefined,
            toDate: r.toDate ? new Date(r.toDate).toISOString() : undefined,
            partySize: r.partySize ?? undefined,
            note: r.note ?? undefined,
            createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
        }));

        const body = { items, reservations: mappedReservations };
        if (cookieResponse) {
            // Return JSON while preserving cookies we just set
            const res = NextResponse.json(body);
            const setCookies = (cookieResponse.headers.get("set-cookie") || "").split(",").filter(Boolean);
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
        return NextResponse.json({ error: "Server error", detail: msg }, { status: 500 });
    }
}
