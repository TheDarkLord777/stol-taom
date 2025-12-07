import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { userRepo } from "@/lib/userRepo";
import { sendVerificationMessage } from "@/lib/telegramGateway";
import { forgotRepo } from "@/lib/forgotRepo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { phone } = (await req.json()) as { phone?: string };
    if (!phone || !/^\+\d{10,15}$/.test(phone)) {
      return NextResponse.json(
        { error: "Telefon raqam noto'g'ri formatda" },
        { status: 400 },
      );
    }

    // Basic cooldown to avoid abuse
    const cooldown = await forgotRepo.getCooldownRemaining(phone);
    if (cooldown > 0) {
      return NextResponse.json(
        { error: "Iltimos bir oz kuting", retryAfter: cooldown },
        { status: 429 },
      );
    }

    const user = await userRepo.getByPhone(phone);
    // For security we return a generic success in production when user is not found.
    // In dev (or when DEV_ADMIN_ENABLED=true) return a 'registered' flag so the UI
    // can show a clearer message. We still avoid sending a verification message.
    const devAdminEnabled =
      process.env.NODE_ENV !== "production" ||
      process.env.DEV_ADMIN_ENABLED === "true";
    if (!user) {
      // set short cooldown to prevent enumeration
      await forgotRepo.setCooldown(phone, 30);
      if (devAdminEnabled)
        return NextResponse.json({ ok: true, registered: false });
      return NextResponse.json({ ok: true });
    }

    // Send verification via gateway
    const sendRes = (await sendVerificationMessage(phone)) as
      | Record<string, unknown>
      | undefined;
    const requestId =
      (sendRes &&
        (sendRes.result as Record<string, unknown> | undefined)?.request_id) ||
      (sendRes && (sendRes as any).request_id) ||
      undefined;
    const reqIdStr = String(
      requestId ?? `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    );

    await forgotRepo.set({
      requestId: reqIdStr,
      phone,
      userId: user.id,
      createdAt: Date.now(),
    });
    await forgotRepo.setCooldown(phone, 30);

    return NextResponse.json({ ok: true, requestId: reqIdStr });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("forgot/request error", msg);
    return NextResponse.json(
      { error: "Server error", detail: msg },
      { status: 500 },
    );
  }
}
