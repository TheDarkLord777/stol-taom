import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ items: [] }, { status: 400 });
  }

  try {
    // Find menu items linked to this restaurant via MenuItemOnRestaurant
    const rows = await prisma.menuItemOnRestaurant.findMany({
      where: { restaurantId: id },
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    const items = rows.map((r) => ({
      id: r.menuItem.id,
      name: r.menuItem.name,
      slug: r.menuItem.slug,
      logoUrl: r.menuItem.logoUrl ?? undefined,
      priceOverride: r.priceOverride ?? undefined,
      createdAt: r.menuItem.createdAt.toISOString(),
      updatedAt: r.menuItem.updatedAt.toISOString(),
    }));

    return NextResponse.json({ items });
  } catch (err) {
    // return empty list on error
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
