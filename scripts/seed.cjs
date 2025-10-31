// Simple seed script to populate Restaurants and MenuItems
// Usage: npm run seed

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const sampleRestaurants = [
  { name: "LOOOK", logoUrl: "/logos/loook.svg" },
  { name: "OQTEPA LAVASH", logoUrl: "/logos/oqtepa.svg" },
  { name: "Bellissimo PIZZA", logoUrl: "/logos/bellissimo.svg" },
];

const sampleMenu = [
  { name: "Somsa", slug: "somsa", logoUrl: "/logos/loook.svg" },
  { name: "Osh", slug: "osh", logoUrl: "/logos/oqtepa.svg" },
  { name: "Mastava", slug: "mastava", logoUrl: "/logos/bellissimo.svg" },
  { name: "Sho'rva", slug: "shorva", logoUrl: "/logos/loook.svg" },
  { name: "Chuchvara", slug: "chuchvara", logoUrl: "/logos/oqtepa.svg" },
  { name: "Lag'mon", slug: "lagmon", logoUrl: "/logos/bellissimo.svg" },
  { name: "Shashlik", slug: "shashlik", logoUrl: "/logos/loook.svg" },
  { name: "Manti", slug: "manti", logoUrl: "/logos/bellissimo.svg" },
  { name: "Xonim", slug: "xonim", logoUrl: "/logos/loook.svg" },
  { name: "Beshbarmoq", slug: "beshbarmoq", logoUrl: "/logos/oqtepa.svg" },
  { name: "Norin", slug: "norin", logoUrl: "/logos/bellissimo.svg" },
  { name: "Hasb", slug: "hasb", logoUrl: "/logos/bellissimo.svg" },
  {
    name: "Tandir go'shti",
    slug: "tandir-goshti",
    logoUrl: "/logos/bellissimo.svg",
  },
  { name: "Grill", slug: "grill", logoUrl: "/logos/bellissimo.svg" },
  { name: "Mampar", slug: "mampar", logoUrl: "/logos/bellissimo.svg" },
];

async function main() {
  console.log("Seeding restaurants...");
  for (const r of sampleRestaurants) {
    await prisma.restaurant.upsert({
      where: { name: r.name },
      update: { logoUrl: r.logoUrl ?? null },
      create: { name: r.name, logoUrl: r.logoUrl ?? null },
    });
  }

  console.log("Seeding menu items...");
  for (const m of sampleMenu) {
    await prisma.menuItem.upsert({
      where: { slug: m.slug },
      update: { name: m.name, logoUrl: m.logoUrl ?? null },
      create: { name: m.name, slug: m.slug, logoUrl: m.logoUrl ?? null },
    });
  }

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
