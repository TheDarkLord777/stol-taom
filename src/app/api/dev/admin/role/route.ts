import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { getUserFromRequest } from '@/lib/jwtAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const devEnabled = process.env.NODE_ENV !== 'production' || process.env.DEV_ADMIN_ENABLED === 'true';

// GET: ?role=roleName -> { allowed: boolean }
// GET without role -> { roles: string[] }
// POST: { phone, roles: ['role1','role2'] } -> { ok: true }
export async function GET(req: NextRequest) {
    if (!devEnabled) return NextResponse.json({ error: 'Dev admin disabled' }, { status: 403 });
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const role = url.searchParams.get('role');
    try {
        const r = getRedis();
        if (!r) return NextResponse.json(role ? { allowed: false } : { roles: [] });

        const key = `dev:role:${user.phone}`;
        const raw = await r.get(key);
        const roles = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
        if (role) return NextResponse.json({ allowed: roles.includes(role) });
        return NextResponse.json({ roles });
    } catch (e) {
        return NextResponse.json(role ? { allowed: false } : { roles: [] });
    }
}

export async function POST(req: NextRequest) {
    if (!devEnabled) return NextResponse.json({ error: 'Dev admin disabled' }, { status: 403 });
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const body = await req.json().catch(() => ({}));
        const { phone, roles, restaurantId } = body as { phone?: string; roles?: string[]; restaurantId?: string };
        if (!phone || !Array.isArray(roles)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        const r = getRedis();
        if (!r) return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
        const key = `dev:role:${phone}`;
        await r.set(key, roles.join(','));

        // If restaurantId provided, also store a dev owner mapping so the management flow can use it
        if (restaurantId) {
            const ownerKey = `dev:restaurant:owner:${restaurantId}`;
            await r.set(ownerKey, phone);
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    if (!devEnabled) return NextResponse.json({ error: 'Dev admin disabled' }, { status: 403 });
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const body = await req.json().catch(() => ({}));
        const { phone, restaurantId } = body as { phone?: string; restaurantId?: string };
        if (!phone) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        const r = getRedis();
        if (!r) return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
        const key = `dev:role:${phone}`;
        await r.del(key);
        if (restaurantId) {
            const ownerKey = `dev:restaurant:owner:${restaurantId}`;
            const current = await r.get(ownerKey).catch(() => null);
            // Only remove owner mapping if it points to this phone
            if (current === phone) await r.del(ownerKey);
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
