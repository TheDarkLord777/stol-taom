#!/usr/bin/env node
/*
 DB-backed prewarm script for restaurants.
 Mirrors style of prewarm-ingredients.cjs: reads restaurants via Prisma and writes versioned redis keys.
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
    console.log("Connecting to DB and Redis...");
    // fetch restaurants
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: "asc" },
    });
    console.log("Found", restaurants.length, "restaurants");

    // use a single version key for restaurants list
    const versionKey = "menu:restaurants:version";
    let verRaw = await r.get(versionKey);
    let ver = verRaw ? Number(verRaw) : 0;
    const ttlMs = Number(process.env.MENU_CACHE_TTL_MS ?? 24 * 60 * 60 * 1000);

    const redisKey = `menu:restaurants:v:${ver}`;
    await r.set(redisKey, JSON.stringify(restaurants), "PX", ttlMs);
    console.log("[prewarm] wrote", redisKey, "count=", restaurants.length);

    // also ensure version key exists
    await r.setnx(versionKey, String(ver));

    console.log("Done prewarming restaurants");
  } catch (err) {
    console.error("prewarm-restaurants failed", err);
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
