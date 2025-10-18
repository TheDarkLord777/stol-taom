import { NextRequest, NextResponse } from 'next/server';
import { UserStore } from '@/lib/store';
import crypto from 'crypto';

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
}

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = (await req.json()) as { phone?: string; password?: string };
    if (!phone || !/^\+\d{10,15}$/.test(phone)) {
      return NextResponse.json({ error: 'Telefon raqam noto\'g\'ri formatda' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Parol talab qilinadi' }, { status: 400 });
    }

    const user = UserStore.get(phone);
    if (!user) {
      return NextResponse.json({ error: 'Ro\'yxatdan o\'tmagan' }, { status: 404 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Parol noto\'g\'ri' }, { status: 401 });
    }

    const res = NextResponse.json({ success: true, user: { id: user.id, phone: user.phone, name: user.name } });
    res.cookies.set('session', user.id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    return res;
  } catch (e: any) {
    console.error('login error', e);
    return NextResponse.json({ error: 'Ichki server xatosi', detail: String(e?.message || e) }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
