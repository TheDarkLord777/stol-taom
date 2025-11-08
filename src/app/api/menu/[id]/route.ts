import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * @swagger
 * /api/menu/{id}:
 *   get:
 *     summary: Get full detail for a menu item (description, ingredients, restaurants)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu item detail
 */
export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const parts = url.pathname.split("/").filter(Boolean);
        // expected: ["api","menu","<id>"] or ["api","menu","<id>",...]
        const id = parts[2];
        if (!id) return NextResponse.json({ error: "Missing menu id" }, { status: 400 });

        const prisma = getPrisma();
        const row = await prisma.menuItem.findUnique({
            where: { id },
            include: {
                ingredients: true,
                restaurants: { include: { restaurant: true } },
            },
        });
        if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json({
            id: row.id,
            name: row.name,
            slug: row.slug,
            logoUrl: row.logoUrl ?? undefined,
            description: (row as any).description ?? undefined,
            ingredients: (row.ingredients ?? []).map((i) => ({ id: String(i.id), name: i.name, mandatory: i.mandatory })),
            restaurants: (row.restaurants ?? []).map((r) => ({ id: r.restaurant.id, name: r.restaurant.name })),
        });
    } catch (e: unknown) {
        console.error("GET /api/menu/[id] error", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
