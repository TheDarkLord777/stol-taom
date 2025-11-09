import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function extractMenuIdFromUrl(urlStr: string) {
    try {
        const url = new URL(urlStr);
        const parts = url.pathname.split("/").filter(Boolean);
        // parts like ["api","menu","<id>","ingredients"]
        const idx = parts.indexOf("ingredients");
        if (idx > 0) return parts[idx - 1];
    } catch {
        // ignore
    }
    return undefined;
}

/**
 * @swagger
 * /api/menu/{id}/ingredients:
 *   get:
 *     summary: Get ingredients for a menu item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of ingredients
 */
export async function GET(req: NextRequest) {
    const id = extractMenuIdFromUrl(req.url);
    if (!id) return NextResponse.json({ error: "Missing menu id" }, { status: 400 });
    try {
        const prisma = getPrisma();
        const items = await prisma.ingredient.findMany({
            where: { menuItemId: id },
            orderBy: { createdAt: "asc" },
        });
        return NextResponse.json({ ingredients: items });
    } catch (e: unknown) {
        console.error("GET /api/menu/[id]/ingredients error", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/menu/{id}/ingredients:
 *   post:
 *     summary: Replace ingredients for a menu item
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
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     mandatory:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Updated list of ingredients
 */
export async function POST(req: NextRequest) {
    const id = extractMenuIdFromUrl(req.url);
    if (!id) return NextResponse.json({ error: "Missing menu id" }, { status: 400 });

    // Prevent destructive operations from being callable in production by default.
    // Allow when running in non-production (dev) or when DEV_ADMIN_ENABLED=true.
    const devAdminEnabled = process.env.NODE_ENV !== 'production' || process.env.DEV_ADMIN_ENABLED === 'true';
    if (!devAdminEnabled) {
        return NextResponse.json({ error: 'Dev admin disabled in production' }, { status: 403 });
    }

    try {
        const body = (await req.json()) as {
            ingredients?: Array<{ id?: string; name: string; mandatory?: boolean }>;
        };

        // validate menu item exists to avoid foreign key errors
        const prisma = getPrisma();
        const menuExists = await prisma.menuItem.findUnique({ where: { id } });
        if (!menuExists) {
            return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
        }
        if (!body.ingredients) {
            return NextResponse.json({ error: "Missing ingredients in body" }, { status: 400 });
        }

        const ingredients = body.ingredients;

        // Replace existing ingredients for the menu item with the provided list
        await prisma.$transaction(async (tx) => {
            await tx.ingredient.deleteMany({ where: { menuItemId: id } });
            const createData = ingredients.map((ing) => ({
                name: ing.name,
                mandatory: Boolean(ing.mandatory),
                menuItemId: id,
            }));
            if (createData.length > 0) {
                await tx.ingredient.createMany({ data: createData });
            }
        });

        const updated = await prisma.ingredient.findMany({ where: { menuItemId: id } });
        return NextResponse.json({ ingredients: updated });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("POST /api/menu/[id]/ingredients error", msg, e);
        return NextResponse.json({ error: "Server error", detail: msg }, { status: 500 });
    }
}
