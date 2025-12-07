const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Listing MenuItems (id, name, createdAt):");
  const items = await prisma.menuItem.findMany({
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
  for (const it of items) {
    console.log(
      `- ${it.id} | ${it.name ?? "<no-name>"} | created: ${it.createdAt?.toISOString?.() ?? it.createdAt} | updated: ${it.updatedAt?.toISOString?.() ?? it.updatedAt}`,
    );
  }

  console.log(
    "\nListing MenuItemOnRestaurant links (id, menuItemId, restaurantId):",
  );
  const links = await prisma.menuItemOnRestaurant.findMany({
    select: { id: true, menuItemId: true, restaurantId: true, createdAt: true },
  });
  for (const l of links) {
    console.log(
      `- ${l.id} | menuItemId=${l.menuItemId} | restaurantId=${l.restaurantId} | created: ${l.createdAt?.toISOString?.() ?? l.createdAt}`,
    );
  }

  // find menu items that have no restaurants
  const orphans = await prisma.menuItem.findMany({
    where: { restaurants: { none: {} } },
    select: { id: true, name: true },
  });
  console.log(
    `\nMenuItems without any MenuItemOnRestaurant links: ${orphans.length}`,
  );
  for (const o of orphans) console.log(`- ${o.id} | ${o.name ?? "<no-name>"}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect().finally(() => process.exit(1));
});
