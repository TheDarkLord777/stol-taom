import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationMessage } from '@/lib/telegramGateway';
import { tempRepo } from '@/lib/tempRepo';

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
  const remain = await tempRepo.getCooldownRemaining(phone);
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
        await tempRepo.setCooldown(phone, retryAfterSec || 5);
        return NextResponse.json(
          { error: `Juda tez-tez so'rov yuborildi. Iltimos ${retryAfterSec} soniya kuting`, retryAfterSec, detail: sendRes },
          { status: 429, headers: { 'Retry-After': String(Math.max(1, retryAfterSec)) } },
        );
      }
      if (/PHONE(_NUMBER)?_INVALID/i.test(err)) {
        return NextResponse.json({ error: "Telefon raqam noto'g'ri", detail: sendRes }, { status: 400 });
      }
      if (/UNAUTHORIZED|INVALID(_TOKEN)?/i.test(err)) {
        return NextResponse.json({ error: "Gateway token noto'g'ri yoki ruxsat yo'q", detail: sendRes }, { status: 401 });
      }
      if (/ACCESS_TOKEN_IP_RESTRICTED/i.test(err)) {
        return NextResponse.json({
          error: "Gateway token IP cheklangan. Serverning jamoat IP manzilini whitelist qiling yoki IP cheklovni o'chiring",
          detail: sendRes,
        }, { status: 403 });
      }
      if (/BALANCE_NOT_ENOUGH|INSUFFICIENT_BALANCE/i.test(err)) {
        return NextResponse.json({
          error: "Gateway balans yetarli emas. Iltimos, hisobni to'ldiring yoki keyinroq urinib ko'ring",
          detail: sendRes,
        }, { status: 402 });
      }
      if (/SERVICE_UNAVAILABLE|BAD_GATEWAY|GATEWAY_TIMEOUT/i.test(err)) {
        return NextResponse.json({ error: "Gateway hozircha mavjud emas. Keyinroq urinib ko'ring", detail: sendRes }, { status: 502 });
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
    await tempRepo.set({
      name,
      phone,
      passwordPlain: password,
      requestId,
      createdAt: Date.now(),
    });

    // 3) Return requestId to client and set a short-lived HttpOnly cookie as fallback
    const res = NextResponse.json({ success: true, requestId, phone });
    try {
      const tempPayload = JSON.stringify({ name, phone, passwordPlain: password, requestId, createdAt: Date.now() });
      res.cookies.set('reg_temp', Buffer.from(tempPayload).toString('base64'), {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 10, // 10 minutes
      });
    } catch {}
    return res;
  } catch (e: any) {
    console.error('register/init error', e);
    const detail = String(e?.message || e);
    if (/TELEGRAM_GATEWAY_TOKEN/i.test(detail)) {
      return NextResponse.json({ error: "Gateway token o'rnatilmagan", detail }, { status: 500 });
    }
    if (/\b(401|403)\b/.test(detail) || /UNAUTHORIZED|FORBIDDEN/i.test(detail)) {
      return NextResponse.json({ error: "Gateway token noto'g'ri yoki ruxsat yo'q", detail }, { status: 401 });
    }
    if (/(502|503|504)/.test(detail) || /BAD_GATEWAY|SERVICE_UNAVAILABLE|GATEWAY_TIMEOUT/i.test(detail)) {
      return NextResponse.json({ error: "Gateway hozircha mavjud emas. Keyinroq urinib ko'ring", detail }, { status: 502 });
    }
    return NextResponse.json({ error: 'Ichki server xatosi', detail }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
