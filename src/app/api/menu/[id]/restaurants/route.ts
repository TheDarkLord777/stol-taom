import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function extractMenuIdFromUrl(urlStr: string) {
    try {
        const url = new URL(urlStr);
        const parts = url.pathname.split("/").filter(Boolean);
        const idx = parts.indexOf("restaurants");
        if (idx > 0) return parts[idx - 1];
    } catch { }
    return undefined;
}

/**
 * @swagger
 * /api/menu/{id}/restaurants:
 *   post:
 *     summary: Assign restaurants to a menu item (replace assignments)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Assigned rows
 */
export async function POST(req: NextRequest) {
    const id = extractMenuIdFromUrl(req.url);
    if (!id) return NextResponse.json({ error: "Missing menu id" }, { status: 400 });

    try {
        const body = (await req.json()) as { restaurantIds?: string[] };
        if (!body.restaurantIds) return NextResponse.json({ error: "Missing restaurantIds" }, { status: 400 });

        const prisma = getPrisma();

        await prisma.$transaction(async (tx) => {
            await tx.menuItemOnRestaurant.deleteMany({ where: { menuItemId: id } });
            if (body.restaurantIds.length > 0) {
                const data = body.restaurantIds.map((rid) => ({ menuItemId: id, restaurantId: rid }));
                await tx.menuItemOnRestaurant.createMany({ data });
            }
        });

        const assigned = await prisma.menuItemOnRestaurant.findMany({ where: { menuItemId: id } });
        return NextResponse.json({ assigned });
    } catch (e: unknown) {
        console.error("POST /api/menu/[id]/restaurants error", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
