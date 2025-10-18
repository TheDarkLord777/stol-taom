// app/api/register/init/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';

// 🔒 Parolni hashlash uchun rounds
const SALT_ROUNDS = 10;

// 🧠 Vaqtinchalik saqlash (productionda Redis yoki DB ishlating!)
const pendingRegistrations = new Map<string, {
  name?: string;
  phone: string;
  hashedPassword: string;
  createdAt: number;
}>();

// 📞 Telegram Gateway sozlamalari
const TELEGRAM_GATEWAY_TOKEN = process.env.TELEGRAM_GATEWAY_TOKEN;
const TELEGRAM_GATEWAY_URL = 'https://gatewayapi.telegram.org';

if (!TELEGRAM_GATEWAY_TOKEN) {
  throw new Error('TELEGRAM_GATEWAY_TOKEN not set in .env.local');
}

async function gatewayPost(endpoint: string, body: any) {
  const res = await fetch(`${TELEGRAM_GATEWAY_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TELEGRAM_GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return await res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { name, phone, password } = await req.json();

    // 🔹 Validatsiya
    if (!phone || !/^\+\d{10,15}$/.test(phone)) {
      return NextResponse.json({ error: 'Telefon raqam noto‘g‘ri' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Parol kamida 6 belgi' }, { status: 400 });
    }

    // 🔹 Parolni hashlash
    const hashedPassword = await hash(password, SALT_ROUNDS);

    // 🔹 1. checkSendAbility
    const checkRes = await gatewayPost('checkSendAbility', { phone_number: phone });
    if (!checkRes.ok) {
      console.error('checkSendAbility failed:', checkRes);
      return NextResponse.json({ error: 'Raqam Telegramda topilmadi' }, { status: 400 });
    }
    const requestId = checkRes.result.request_id;

    // 🔹 2. sendVerificationMessage
    const sendRes = await gatewayPost('sendVerificationMessage', {
      phone_number: phone,
      request_id: requestId,
      code_length: 6,
      ttl: 300,
    });

    if (!sendRes.ok) {
      console.error('sendVerificationMessage failed:', sendRes);
      return NextResponse.json({ error: 'Kod yuborishda xatolik' }, { status: 500 });
    }

    // 🔹 3. Ma'lumotlarni vaqtinchalik saqlash
    pendingRegistrations.set(requestId, {
      name,
      phone,
      hashedPassword,
      createdAt: Date.now(),
    });

    // 🔹 Tozalash (5 daqiqadan keyin eskirganlarni o'chirish)
    setTimeout(() => {
      if (pendingRegistrations.has(requestId)) {
        pendingRegistrations.delete(requestId);
      }
    }, 5 * 60 * 1000);

    // ✅ Muvaffaqiyatli javob
    return NextResponse.json({ phone, requestId });

  } catch (error: any) {
    console.error('Register init error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}