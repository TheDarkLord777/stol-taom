import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwtAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const orderId = body?.orderId as string | undefined;
        const phone = body?.phone as string | undefined;
        if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

        const prisma = getPrisma();
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        if (order.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // Create a minimal payment request record if you have one. For now return a placeholder response.
        // Replace this section with a call to your payment gateway that triggers a phone/USSD/SMS charge.

        const paymentRequest = {
            id: `phone-${Date.now()}`,
            orderId,
            method: 'phone',
            phone: phone ?? user.phone,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        return NextResponse.json({ paymentRequest });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: 'Server error', detail: msg }, { status: 500 });
    }
}
