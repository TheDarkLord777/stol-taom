// app/api/verify/route.ts
import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_GATEWAY_URL = "https://gatewayapi.telegram.org";
const TOKEN = process.env.TELEGRAM_GATEWAY_TOKEN;

if (!TOKEN) {
  throw new Error("TELEGRAM_GATEWAY_TOKEN not set in environment");
}

async function gatewayRequest(endpoint: string, body: any) {
  const res = await fetch(`${TELEGRAM_GATEWAY_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return await res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { phone, action, code, requestId } = await req.json();

    // Telefon raqam E.164 formatda bo'lishi kerak
    if (!/^\+\d{10,15}$/.test(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 },
      );
    }

    switch (action) {
      case "checkSendAbility": {
        const data = await gatewayRequest("checkSendAbility", {
          phone_number: phone,
        });
        return NextResponse.json(data);
      }

      case "sendCode": {
        const payload: any = {
          phone_number: phone,
          code_length: 6,
          ttl: 300,
        };
        if (requestId) payload.request_id = requestId; // agar oldindan checkSendAbility qilingan bo'lsa
        const data = await gatewayRequest("sendVerificationMessage", payload);
        return NextResponse.json(data);
      }

      case "verifyCode": {
        if (!code || !requestId) {
          return NextResponse.json(
            { error: "code and requestId required" },
            { status: 400 },
          );
        }
        const data = await gatewayRequest("checkVerificationStatus", {
          request_id: requestId,
          code,
        });
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Gateway error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
