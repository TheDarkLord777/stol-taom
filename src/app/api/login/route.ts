import { NextRequest, NextResponse } from 'next/server';
import { userRepo } from '@/lib/userRepo';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

function verifyPassword(password: string, stored: string) {
  try {
    // bcrypt format detection
    if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
      return bcrypt.compareSync(password, stored);
    }
    // scrypt format: salt:hexhash
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const verify = crypto.scryptSync(password, salt, 64);
    const hashBuf = Buffer.from(hash, 'hex');
    if (hashBuf.length !== verify.length) return false;
    return crypto.timingSafeEqual(hashBuf, verify);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = (await req.json()) as { phone?: string; password?: string };
    if (!phone || !/^\+\d{10,15}$/.test(phone)) {
      return NextResponse.json({ error: 'Telefon raqam noto\'g\'ri formatda' }, { status: 400 });
    }
    if (!password || password.length < 1) {
      return NextResponse.json({ error: 'Parol talab qilinadi' }, { status: 400 });
    }

  const user = await userRepo.getByPhone(phone);
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
