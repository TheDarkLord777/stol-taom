const { PrismaClient } = require('@prisma/client');
(async () => {
    const prisma = new PrismaClient();
    try {
        const tables = await prisma.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname = 'myapp' ORDER BY tablename");
        console.log('tables:', tables.map(t => t.tablename));
        const counts = {};
        const q = async (label, sql) => {
            const r = await prisma.$queryRawUnsafe(sql);
            console.log(`${label}:`, r[0] ? Object.values(r[0])[0] : 0);
        };
        await q('CartItem count', `SELECT COUNT(*) FROM myapp."CartItem"`);
        await q('Cart count', `SELECT COUNT(*) FROM myapp."Cart"`);
        await q('MenuItem count', `SELECT COUNT(*) FROM myapp."MenuItem"`);
        await q('User count', `SELECT COUNT(*) FROM myapp."User"`);
        const backupExists = tables.some(t => t.tablename === 'CartItem_backup_before_dedupe_menuitem');
        console.log('CartItem_backup exists?', backupExists);
        if (backupExists) {
            const sample = await prisma.$queryRawUnsafe(`SELECT * FROM myapp."CartItem_backup_before_dedupe_menuitem" LIMIT 5`);
            console.log('backup sample rows:', sample);
        }
    } catch (e) {
        console.error('inspect error', e);
    } finally {
        await prisma.$disconnect();
    }
})();
