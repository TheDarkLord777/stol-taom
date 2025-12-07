import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwtAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const devEnabled = process.env.NODE_ENV !== 'production' || process.env.DEV_ADMIN_ENABLED === 'true';

export async function POST(req: NextRequest) {
    if (!devEnabled) return NextResponse.json({ error: 'Dev APIs disabled' }, { status: 403 });
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json().catch(() => ({}));
        const orderId = body?.orderId as string | undefined;
        const reservationId = body?.reservationId as string | undefined;
        const prisma = getPrisma();

        if (!orderId && !reservationId) return NextResponse.json({ error: 'orderId or reservationId required' }, { status: 400 });

        if (orderId) {
            const order = await prisma.order.findUnique({ where: { id: orderId } });
            if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
            if (order.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            // Mark order as paid and update status
            await prisma.order.update({ where: { id: orderId }, data: { status: 'paid' } });
        }

        if (reservationId) {
            const resv = await prisma.reservation.findUnique({ where: { id: reservationId } });
            if (!resv) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
            if (resv.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            // Mark reservation as paid by writing a paid flag into note (dev/demo)
            let noteObj: any = { paid: true, paidAt: new Date().toISOString() };
            try {
                if (typeof resv.note === 'string' && resv.note) {
                    const parsed = JSON.parse(resv.note);
                    if (parsed && typeof parsed === 'object') noteObj = { ...parsed, ...noteObj };
                }
            } catch { }
            await prisma.reservation.update({ where: { id: reservationId }, data: { note: JSON.stringify(noteObj) } });
        }

        // Optionally notify via BroadcastChannel (client will refetch /api/orders)
        try {
            const bc = new BroadcastChannel('orders');
            bc.postMessage({ type: 'orders:update' });
            bc.close();
        } catch { }

        return NextResponse.json({ ok: true });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: 'Server error', detail: msg }, { status: 500 });
    }
}
