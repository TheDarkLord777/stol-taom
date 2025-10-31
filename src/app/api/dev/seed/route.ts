import { NextResponse } from "next/server";
import { restaurantRepo } from "@/lib/restaurantRepo";
import { menuRepo } from "@/lib/menuRepo";

export const dynamic = "force-dynamic";

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

export async function POST() {
  // In real app, protect this or run only in dev
  for (const r of sampleRestaurants) {
    await restaurantRepo.upsert(r);
  }
  for (const m of sampleMenu) {
    await menuRepo.upsert(m);
  }
  return NextResponse.json({ ok: true });
}
