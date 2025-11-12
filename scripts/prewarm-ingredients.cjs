// Simple pre-warm script: fetch all menu items and write their ingredients into Redis
// Usage: npm run prewarm:ingredients

const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

const prisma = new PrismaClient();

async function main() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const ttlMs = Number(process.env.INGREDIENT_CACHE_TTL_MS ?? 24 * 60 * 60 * 1000);
    const r = new Redis(redisUrl);

    console.log('Pre-warm: connecting to redis', redisUrl);

    try {
        const menus = await prisma.menuItem.findMany({ select: { id: true, slug: true, name: true } });
        console.log(`Found ${menus.length} menu items. Pre-warming ingredients...`);

        for (const m of menus) {
            try {
                const items = await prisma.ingredient.findMany({ where: { menuItemId: m.id }, orderBy: { createdAt: 'asc' } });
                // ensure version key exists (default 0)
                const verKey = `menu:ingredients:version:${m.id}`;
                const verRaw = await r.get(verKey);
                const ver = verRaw ? Number(verRaw) : 0;
                const key = `menu:ingredients:v:${ver}:id:${m.id}`;
                await r.set(key, JSON.stringify(items), 'PX', ttlMs);
                console.log('[prewarm] wrote', key, 'items=', items.length);
            } catch (err) {
                console.warn('[prewarm] failed for', m.id, err && err.message ? err.message : err);
            }
        }

        console.log('Pre-warm complete. Close redis/prisma.');
    } finally {
        try { await r.quit(); } catch { }
        try { await prisma.$disconnect(); } catch { }
    }
}

main().catch((e) => {
    console.error('prewarm failed', e);
    process.exitCode = 1;
});
