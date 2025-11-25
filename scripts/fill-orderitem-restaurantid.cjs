#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    const preview = args.includes('--preview');
    const apply = args.includes('--apply');
    const limitIndex = args.indexOf('--limit');
    const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : undefined;
    const restIndex = args.indexOf('--restaurant');
    const targetRestaurant = restIndex !== -1 ? args[restIndex + 1] : null;

    console.log('fill-orderitem-restaurantid: starting');
    console.log(`options: preview=${preview}, apply=${apply}, limit=${limit ?? 'none'}, restaurant=${targetRestaurant ?? 'any'}`);

    // load menu->restaurant mappings
    const links = await prisma.menuItemOnRestaurant.findMany({ select: { menuItemId: true, restaurantId: true } });
    const map = Object.create(null);
    for (const l of links) {
        if (!map[l.menuItemId]) map[l.menuItemId] = [];
        map[l.menuItemId].push(l.restaurantId);
    }
    const menuIds = Object.keys(map);
    if (menuIds.length === 0) {
        console.log('No menu->restaurant mappings found (table menu_item_on_restaurant is empty). Nothing to do.');
        return;
    }

    // fetch order_items with null restaurantId (optionally limited)
    const where = { restaurantId: null };
    const itemsRaw = await prisma.orderItem.findMany({ where, select: { id: true, orderId: true, menuItemId: true }, take: limit });

    // filter to those whose menuItemId has a mapping
    const candidates = itemsRaw.filter((it) => map[it.menuItemId] && map[it.menuItemId].length > 0);
    // optionally filter to a specific restaurant
    const toProcess = targetRestaurant ? candidates.filter((it) => map[it.menuItemId].includes(targetRestaurant)) : candidates;

    if (toProcess.length === 0) {
        console.log('No matching order_item rows to update.');
        return;
    }

    console.log(`Found ${toProcess.length} order_item rows that can be mapped.`);
    console.table(toProcess.map((it) => ({ id: it.id, orderId: it.orderId, menuItemId: it.menuItemId, mapped: map[it.menuItemId].join(',') })));

    if (preview && !apply) {
        console.log('Preview mode. No changes were made. Rerun with --apply to perform updates.');
        return;
    }

    if (!apply) {
        console.log('No --apply flag provided. Use --apply to actually update rows. Exiting.');
        return;
    }

    console.log('Applying updates...');
    let updated = 0;
    for (const it of toProcess) {
        const restaurants = map[it.menuItemId];
        // choose assignment: prefer targetRestaurant if provided and present, otherwise use first mapping
        const assign = targetRestaurant && restaurants.includes(targetRestaurant) ? targetRestaurant : restaurants[0];
        try {
            await prisma.orderItem.update({ where: { id: it.id }, data: { restaurantId: assign } });
            updated++;
        } catch (err) {
            console.error(`Failed to update order_item ${it.id}:`, err instanceof Error ? err.message : String(err));
        }
    }

    console.log(`Done. Updated ${updated} rows.`);
}

main()
    .catch((e) => {
        console.error('Script error:', e instanceof Error ? e.message : String(e));
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
