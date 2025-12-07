#!/usr/bin/env node
/*
 DB-backed prewarm script for menu list (menu items).
 Writes versioned redis keys: menu:list:v:<ver>:limit:<limit>
*/

const dotenv = require("dotenv");
dotenv.config({ path: process.env.DOTENV_PATH || ".env.local" });

const Redis = require("ioredis");
const { PrismaClient } = require("@prisma/client");

(async function main() {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const r = new Redis(redisUrl);
  const prisma = new PrismaClient();

  try {
    console.log("Prewarm menu items: connecting to DB and Redis...");
    const limits = [10, 25, 50, 100];
    const ttlMs = Number(
      process.env.MENU_CACHE_TTL_MS ?? 3 * 24 * 60 * 60 * 1000,
    );

    // fetch full menu items sorted by name
    const rows = await prisma.menuItem.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        createdAt: true,
      },
    });
    const items = rows.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      logoUrl: m.logoUrl ?? undefined,
      createdAt: m.createdAt.getTime(),
    }));
    console.log("Found", items.length, "menu items");

    // ensure version key exists
    const versionKey = "menu:list:version";
    let verRaw = await r.get(versionKey);
    let ver = verRaw ? Number(verRaw) : 0;

    for (const limit of limits) {
      const redisKey = `menu:list:v:${ver}:limit:${limit}`;
      const payload = JSON.stringify(items.slice(0, limit));
      await r.set(redisKey, payload, "PX", ttlMs);
      console.log(
        "[prewarm] wrote",
        redisKey,
        "count=",
        Math.min(limit, items.length),
      );
    }

    // ensure version key exists (setnx)
    await r.setnx(versionKey, String(ver));

    console.log("Prewarm menu items complete");
  } catch (err) {
    console.error("prewarm-menuitems failed", err);
    process.exitCode = 1;
  } finally {
    try {
      await prisma.$disconnect();
    } catch (e) {}
    try {
      await r.quit();
    } catch (e) {}
  }
})();
