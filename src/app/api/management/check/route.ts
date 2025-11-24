import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwtAuth';
import { getRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const restaurantId = url.searchParams.get('restaurantId');
    if (!restaurantId) return NextResponse.json({ error: 'restaurantId required' }, { status: 400 });
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ allowed: false }, { status: 200 });

    try {
        const prisma = getPrisma();
        // Check DB-backed manager mapping (RestaurantManager)
        try {
            const mgr = await prisma.restaurantManager.findFirst({ where: { restaurantId, userId: user.id } });
            if (mgr) return NextResponse.json({ allowed: true });
        } catch (e) {
            // ignore DB errors and fallback to Redis
        }

        // Fallback: check dev Redis mapping `dev:restaurant:owner:<id>` for compatibility
        try {
            const r = getRedis();
            if (r) {
                const key = `dev:restaurant:owner:${restaurantId}`;
                const ownerPhone = await r.get(key);
                if (ownerPhone && ownerPhone === user.phone) {
                    return NextResponse.json({ allowed: true });
                }
            }
        } catch (_) { }

        return NextResponse.json({ allowed: false });
    } catch (err) {
        return NextResponse.json({ allowed: false });
    }
}
