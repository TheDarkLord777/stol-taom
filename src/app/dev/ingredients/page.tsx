import { getPrisma } from '@/lib/prisma';
import React from 'react';
import IngredientsAdminClient from './IngredientsAdminClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Page() {
    // Dev-only: fetch data via Prisma directly on the server
    const prisma = getPrisma();

    const menuItems = await prisma.menuItem.findMany({
        orderBy: { name: 'asc' },
        include: {
            ingredients: true,
            restaurants: { include: { restaurant: true } },
        },
    });

    const restaurants = await prisma.restaurant.findMany({ orderBy: { name: 'asc' } });

    // serialize dates and types for client
    const items = menuItems.map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        logoUrl: m.logoUrl ?? undefined,
        createdAt: m.createdAt.getTime(),
        ingredients: (m.ingredients ?? []).map((ing) => ({ id: String(ing.id), name: ing.name, mandatory: ing.mandatory })),
        restaurantIds: (m.restaurants ?? []).map((r) => r.restaurantId),
    }));

    const rest = restaurants.map((r) => ({ id: r.id, name: r.name }));

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Dev: Ingredients & Restaurants</h1>
            {/* Client component handles UI and local state */}
            {/* @ts-ignore server -> client prop passing of complex objects */}
            <IngredientsAdminClient initialItems={items} initialRestaurants={rest} />
        </div>
    );
}
