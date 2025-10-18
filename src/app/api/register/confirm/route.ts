import { NextRequest, NextResponse } from 'next/server';
import { checkVerificationStatus } from '@/lib/telegramGateway';
import { TempStore, UserStore } from '@/lib/store';
import crypto from 'crypto';

function hashPassword(password: string) {
  // Use Node crypto scrypt as a light alternative; in real app, use bcrypt
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
}

export async function POST(req: NextRequest) {
  try {
    const { requestId, code } = (await req.json()) as {
      requestId?: string;
      code?: string;
    };

    if (!requestId || !code) {
      return NextResponse.json({ error: 'requestId va kod talab qilinadi' }, { status: 400 });
    }

    const temp = TempStore.getByRequestId(requestId);
    if (!temp) {
      return NextResponse.json({ error: 'Ariza topilmadi yoki eskirgan' }, { status: 404 });
    }

    const verifyRes: any = await checkVerificationStatus(requestId, code);
    if (verifyRes && verifyRes.ok === false && typeof verifyRes.error === 'string') {
      const m = /FLOOD_WAIT_(\d+)/i.exec(verifyRes.error);
      if (m) {
        const retryAfterSec = Number(m[1] || 0);
        return NextResponse.json(
          { error: `Juda tez-tez so'rov yuborildi. Iltimos ${retryAfterSec} soniya kuting`, retryAfterSec, detail: verifyRes },
          { status: 429, headers: { 'Retry-After': String(Math.max(1, retryAfterSec)) } },
        );
      }
    }
    const isVerified =
      verifyRes?.verified === true ||
      verifyRes?.status === 'verified' ||
      verifyRes?.data?.verified === true ||
      verifyRes?.result?.status === 'verified';
    if (!isVerified) {
      return NextResponse.json({ error: 'Kod noto\'g\'ri', detail: verifyRes }, { status: 400 });
    }

    // Create user if not exists
    const existing = UserStore.get(temp.phone);
    if (existing) {
      // Already registered
      TempStore.deleteByRequestId(requestId);
      return NextResponse.json({ error: 'Ushbu raqam allaqachon ro\'yxatdan o\'tgan' }, { status: 409 });
    }

    const passwordHash = hashPassword(temp.passwordPlain);
    const user = UserStore.create({
      id: crypto.randomUUID(),
      name: temp.name,
      phone: temp.phone,
      passwordHash,
      createdAt: Date.now(),
    });

    // Clear temp
    TempStore.deleteByRequestId(requestId);

    // Issue a simple session cookie (for demo). Replace with proper auth.
    const res = NextResponse.json({ success: true, user: { id: user.id, phone: user.phone, name: user.name } });
    res.cookies.set('session', user.id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      // secure should be true on HTTPS
    });
    return res;
  } catch (e: any) {
    console.error('register/confirm error', e);
    return NextResponse.json({ error: 'Ichki server xatosi', detail: String(e?.message || e) }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
