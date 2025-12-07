import React from "react";
import { getPrisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
};

export default async function RestaurantPage({ params }: Props) {
  const prisma = getPrisma();
  const id = params.id;

  if (!id) return notFound();

  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) return notFound();

    // load menu items associated with this restaurant
    const links = await prisma.menuItemOnRestaurant.findMany({
      where: { restaurantId: id },
      include: { menuItem: true },
      orderBy: { createdAt: "desc" },
    });

    const menu = links.map((l) => l.menuItem).filter(Boolean);

    return (
      <main className="p-6 mx-auto max-w-4xl">
        <div className="flex items-center gap-4">
          {restaurant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="h-24 w-24 rounded object-cover"
            />
          ) : (
            <div className="h-24 w-24 bg-gray-100 rounded" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{restaurant.name}</h1>
            <div className="text-sm text-gray-600">id: {restaurant.id}</div>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">Menu</h2>
          {menu.length === 0 ? (
            <div className="text-sm text-gray-500 mt-2">
              No menu items found for this restaurant.
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {menu.map((m) => (
                <li
                  key={m.id}
                  className="p-3 border rounded flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-gray-600">{m.slug}</div>
                  </div>
                  <div>
                    <a
                      href={`/menu?restaurant=${encodeURIComponent(String(id))}`}
                      className="text-blue-600 text-sm"
                    >
                      View on menu
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    );
  } catch (err) {
    // If DB error, show 404 to match user expectation
    return notFound();
  }
}
