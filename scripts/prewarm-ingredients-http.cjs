// Pre-warm ingredients by calling the running dev server endpoints.
// This avoids direct DB access — useful when DATABASE_URL is not available locally.
// Usage: run your dev server (npm run dev) and in another terminal run:
//   node scripts/prewarm-ingredients-http.cjs

(async () => {
    try {
        const base = process.env.PREWARM_BASE_URL || 'http://localhost:3000';
        console.log('Prewarm (http): using base', base);

        const menuRes = await fetch(`${base}/api/menu`);
        if (!menuRes.ok) throw new Error('Failed to fetch /api/menu');
        const menuJson = await menuRes.json();
        const items = Array.isArray(menuJson.items) ? menuJson.items : menuJson;
        console.log('Found', items.length, 'menu items');

        for (const it of items) {
            try {
                const id = it.id;
                const r = await fetch(`${base}/api/menu/${id}/ingredients`);
                if (!r.ok) {
                    console.warn('[prewarm:http] failed', id, r.status);
                    continue;
                }
                const json = await r.json();
                const count = Array.isArray(json.ingredients) ? json.ingredients.length : 0;
                console.log('[prewarm:http] warmed', id, 'ingredients=', count);
            } catch (e) {
                console.warn('[prewarm:http] error for', it.id, e && e.message ? e.message : e);
            }
        }

        console.log('Prewarm (http) complete');
    } catch (e) {
        console.error('Prewarm (http) failed', e && e.message ? e.message : e);
        process.exitCode = 1;
    }
})();
