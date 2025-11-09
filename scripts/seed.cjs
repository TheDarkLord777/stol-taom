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
  { name: "Somsa", slug: "somsa", logoUrl: "/photo/somsa.jpg" },
  { name: "Osh", slug: "osh", logoUrl: "/photo/osh.jpg" },
  { name: "Mastava", slug: "mastava", logoUrl: "/photo/mastava.jpg" },
  { name: "Sho'rva", slug: "shorva", logoUrl: "/photo/shorva.jpg" },
  { name: "Chuchvara", slug: "chuchvara", logoUrl: "/photo/chuchvara.jpg" },
  { name: "Lag'mon", slug: "lagmon", logoUrl: "/photo/lagmon.jpg" },
  { name: "Shashlik", slug: "shashlik", logoUrl: "/photo/shashlik.jpg" },
  { name: "Manti", slug: "manti", logoUrl: "/photo/manti.jpg" },
  { name: "Xonim", slug: "xonim", logoUrl: "/photo/xonim.jpg" },
  { name: "Beshbarmoq", slug: "beshbarmoq", logoUrl: "/photo/beshbarmoq.jpg" },
  { name: "Norin", slug: "norin", logoUrl: "/photo/norin.jpg" },
  { name: "Hasb", slug: "hasb", logoUrl: "/photo/hasb.jpg" },
  { name: "Tandir go'shti", slug: "tandir-goshti", logoUrl: "/photo/tandirgosht.jpg" },
  { name: "Grill", slug: "grill", logoUrl: "/photo/grill.jpg" },
  { name: "Mampar", slug: "mampar", logoUrl: "/photo/mampar.jpg" },
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

  // Ingredients per menu slug (Uzbek names). First ingredient marked mandatory.
  const ingredientsMap = {
    // 1. Somsa
    somsa: [
      { name: "Xamir (un, suv, tuz)", mandatory: true },
      { name: "Go'sht (qo'y yoki mol)", mandatory: true },
      { name: "Piyoz", mandatory: true },
      { name: "Dumaloq yog'", mandatory: false },
      { name: "Ziravorlar (zira, murch)", mandatory: false },
    ],
    // 2. Osh (Palov)
    osh: [
      { name: "Guruch", mandatory: true },
      { name: "Go'sht (qo'y yoki mol)", mandatory: true },
      { name: "Yog'", mandatory: true },
      { name: "Sabzi", mandatory: true },
      { name: "Piyoz", mandatory: true },
      { name: "Ziravorlar (zira, tuz)", mandatory: true },
      { name: "No'xat / Kishmish", mandatory: false },
    ],
    // 3. Mastava
    mastava: [
      { name: "Go'sht (qo'y yoki mol)", mandatory: true },
      { name: "Guruch", mandatory: true },
      { name: "Sabzi", mandatory: false },
      { name: "Piyoz", mandatory: false },
      { name: "Pomidor/tomat", mandatory: false },
      { name: "Kartoshka (ixtiyoriy)", mandatory: false },
      { name: "Ko'katlar", mandatory: false },
      { name: "Qatiq (suzish uchun)", mandatory: false },
    ],
    // 4. Sho'rva
    shorva: [
      { name: "Go'sht (qo'y yoki mol)", mandatory: true },
      { name: "Suv (Bulyon)", mandatory: true },
      { name: "Kartoshka", mandatory: true },
      { name: "Sabzi", mandatory: false },
      { name: "Piyoz", mandatory: false },
      { name: "Pomidor", mandatory: false },
      { name: "Ko'katlar", mandatory: false },
    ],
    // 5. Chuchvara
    chuchvara: [
      { name: "Xamir (un, suv, tuxum, tuz)", mandatory: true },
      { name: "Qiyma (go'sht, piyoz, ziravorlar)", mandatory: true },
      { name: "Qiyom (sho'rva) uchun sabzi, piyoz, pomidor", mandatory: false },
    ],
    // 6. Lag'mon
    lagmon: [
      { name: "Cho'zma xamir (un, suv, tuz)", mandatory: true },
      { name: "Qayla (go'sht, piyoz, sabzi, tomat, ziravorlar)", mandatory: true },
      { name: "Sabzavotlar (balg'ari, selderey, kabilarda)", mandatory: false },
    ],
    // 7. Manti
    manti: [
      { name: "Xamir (un, suv, tuz)", mandatory: true },
      { name: "Qiyma (go'sht, piyoz)", mandatory: true },
      { name: "Dumaloq yog' (ixtiyoriy)", mandatory: false },
    ],
    // 8. Xonim
    xonim: [
      { name: "Xamir (un, suv, tuz)", mandatory: true },
      { name: "Nachinka (Qiyma yoki kartoshka va piyoz)", mandatory: true },
      { name: "Yog'", mandatory: false },
    ],
    // 9. Norin
    norin: [
      { name: "Maxsus xamir (un, tuxum, tuz, suv)", mandatory: true },
      { name: "Ot yoki qo'y go'shti (pishirilgan)", mandatory: true },
      { name: "Go'sht suvi (sho'rva) / piyoz", mandatory: false },
    ],
    // 10. Hasib
    hasib: [
      { name: "Go'sht (ichki a'zolar: jigar, o'pka, buyrak, taloq)", mandatory: true },
      { name: "Yog'", mandatory: false },
      { name: "Guruch yoki yorma", mandatory: false },
      { name: "Ichak (ichiga solish uchun)", mandatory: true },
    ],
    // 11. Tandir go'shti (tandirgosht kaliti avvalgidek saqlanadi)
    tandirgosht: [
      { name: "Qo'y go'shti (ko'pincha butun son)", mandatory: true },
      { name: "Tuz, ziravorlar", mandatory: true },
      { name: "Tandir", mandatory: true },
    ],
    // 12. Mampar
    mampar: [
      { name: "Xamir (un, suv, tuxum) - kesilgan bo'laklar", mandatory: true },
      { name: "Qayla (go'sht, piyoz, sabzi, kartoshka)", mandatory: true },
      { name: "Sho'rva (Bulyon)", mandatory: true },
    ],
    // 13. Grill
    grill: [
      { name: "Asosiy mahsulot (Go'sht, Parranda, Baliq yoki Sabzavot)", mandatory: true },
      { name: "Tuz, ziravorlar", mandatory: false },
      { name: "Yog' va marinad", mandatory: false },
    ],
    // 14. Beshbarmoq
    beshbarmoq: [
      { name: "Go'sht (Qo'y, mol yoki ot go'shti)", mandatory: true },
      { name: "Keng xamir (Un, suv, tuz)", mandatory: true },
      { name: "Piyoz", mandatory: true },
      { name: "Sho'rva (Bulyon)", mandatory: true },
      { name: "Qazi (ixtiyoriy, an'anaviy)", mandatory: false },
    ],
    // 15. Shashlik (Yangi qo'shildi)
    shashlik: [
      { name: "Go'sht (qo'y, mol, tovuq, baliq) yoki sabzavot", mandatory: true },
      { name: "Marinad (piyoz, ziravorlar, o'simlik yog'i/sirka)", mandatory: true },
      { name: "Tuz", mandatory: true },
      { name: "Dud (ko'mir)", mandatory: true },
    ],
  };

  // Create ingredients for each menu item from mapping
  for (const slug of Object.keys(ingredientsMap)) {
    const menu = await prisma.menuItem.findUnique({ where: { slug } });
    if (!menu) continue;
    // remove existing ingredients for idempotent seed
    await prisma.ingredient.deleteMany({ where: { menuItemId: menu.id } });
    const rows = ingredientsMap[slug].map((it) => ({
      name: it.name,
      mandatory: it.mandatory ?? false,
      menuItemId: menu.id,
    }));
    if (rows.length) {
      await prisma.ingredient.createMany({ data: rows });
    }
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
