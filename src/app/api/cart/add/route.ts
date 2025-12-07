import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserFromRequest, refreshAccessToken, ACCESS_TOKEN_NAME, ACCESS_TTL_SEC } from "@/lib/jwtAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        let user = await getUserFromRequest(req);
        // If access token missing/expired, try to rotate using refresh token (best-effort).
        // refreshAccessToken(req) returns { access, user } if refresh valid.
        if (!user) {
            try {
                const refreshed = await refreshAccessToken(req);
                if (refreshed?.user) {
                    user = refreshed.user;
                }
            } catch {
                // ignore
            }
        }
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

        // try to infer the restaurant for this menu item so we can persist it with the cart item
        let inferredRestaurantId: string | null = null;
        try {
            const link = await prisma.menuItemOnRestaurant.findFirst({ where: { menuItemId: body.menuItemId }, select: { restaurantId: true } });
            if (link?.restaurantId) inferredRestaurantId = link.restaurantId;
        } catch { }

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
                restaurantId: inferredRestaurantId ?? undefined,
            },
        });

        // Invalidate per-user orders cache so newly added items appear in /orders
        try {
            const { getRedis } = await import("@/lib/redis");
            const r = getRedis();
            if (r) await r.del(`orders:view:${user.id}`);
        } catch {
            // best-effort; ignore cache invalidate errors
        }

        // If we obtained an access token via refreshAccessToken(req), it did not set
        // cookies on the response (since we didn't pass a NextResponse). If refresh
        // returned an access token we can set it here so the client receives it.
        const res = NextResponse.json({ success: true, item });
        try {
            const refreshed = await refreshAccessToken(req);
            if (refreshed?.access) {
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
                res.cookies.set(ACCESS_TOKEN_NAME, refreshed.access, {
                    ...base,
                    maxAge: ACCESS_TTL_SEC,
                });
            }
        } catch {
            // ignore cookie set errors
        }

        return res;
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("POST /api/cart/add error", msg);
        return NextResponse.json({ error: "Server error", detail: msg }, { status: 500 });
    }
}
