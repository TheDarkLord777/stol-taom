import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationMessage } from '@/lib/telegramGateway';
import { TempStore } from '@/lib/store';

function isValidPhone(phone: string) {
  return /^\+\d{10,15}$/.test(phone);
}

export async function POST(req: NextRequest) {
  try {
    const { name, phone, password } = (await req.json()) as {
      name?: string;
      phone?: string;
      password?: string;
    };

    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json({ error: 'Telefon raqam noto\'g\'ri formatda' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' }, { status: 400 });
    }

    // 1) Server-side cooldown to avoid FLOOD_WAIT
    const remain = TempStore.getCooldownRemaining(phone);
    if (remain > 0) {
      return NextResponse.json(
        { error: `Juda tez-tez so'rov yuborildi. Iltimos ${remain} soniya kuting`, retryAfterSec: remain },
        { status: 429, headers: { 'Retry-After': String(remain) } },
      );
    }

    // 2) Send code directly
    const sendRes: any = await sendVerificationMessage(phone);

    // Handle gateway-declared errors
    if (sendRes && sendRes.ok === false) {
      const err: string = String(sendRes.error || 'gateway_error');
      const m = /FLOOD_WAIT_(\d+)/i.exec(err);
      if (m) {
        const retryAfterSec = Number(m[1] || 0);
        TempStore.setCooldown(phone, retryAfterSec || 5);
        return NextResponse.json(
          { error: `Juda tez-tez so'rov yuborildi. Iltimos ${retryAfterSec} soniya kuting`, retryAfterSec, detail: sendRes },
          { status: 429, headers: { 'Retry-After': String(Math.max(1, retryAfterSec)) } },
        );
      }
      if (/PHONE(_NUMBER)?_INVALID/i.test(err)) {
        return NextResponse.json({ error: "Telefon raqam noto'g'ri", detail: sendRes }, { status: 400 });
      }
      return NextResponse.json({ error: "Gateway xatosi", detail: sendRes }, { status: 502 });
    }

    const requestId: string | undefined =
      sendRes?.request_id ||
      sendRes?.requestId ||
      sendRes?.data?.request_id ||
      sendRes?.data?.requestId ||
      sendRes?.result?.request_id ||
      sendRes?.result?.requestId;
    if (!requestId) {
      return NextResponse.json({ error: 'Tasdiqlash kodini yuborib bo\'lmadi', detail: sendRes }, { status: 500 });
    }

    // 2) Store temp registration in-memory (not DB yet)
    TempStore.set({
      name,
      phone,
      passwordPlain: password,
      requestId,
      createdAt: Date.now(),
    });

  // 3) Return requestId to client
  return NextResponse.json({ success: true, requestId, phone });
  } catch (e: any) {
    console.error('register/init error', e);
    return NextResponse.json({ error: 'Ichki server xatosi', detail: String(e?.message || e) }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
