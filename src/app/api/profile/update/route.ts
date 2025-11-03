import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwtAuth";
import type { TempRegistration } from "@/lib/store";
import { sendVerificationMessage } from "@/lib/telegramGateway";
import { tempRepo } from "@/lib/tempRepo";
import { userRepo } from "@/lib/userRepo";

function isValidPhone(phone: string) {
  return /^\+\d{10,15}$/.test(phone);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as {
      name?: string;
      email?: string;
      phone?: string;
    };
    const { name, email, phone } = body;

    // If only name/email changed, update directly
    if (
      (!phone || phone === user.phone) &&
      (name !== undefined || email !== undefined)
    ) {
      const updated = await userRepo.updateById(user.id, { name, email });
      if (!updated)
        return NextResponse.json(
          { error: "Unable to update profile" },
          { status: 500 },
        );
      return NextResponse.json({
        success: true,
        user: { id: updated.id, name: updated.name, phone: updated.phone },
      });
    }

    // If phone changed, start verification flow similar to register/init
    if (phone && phone !== user.phone) {
      if (!isValidPhone(phone)) {
        return NextResponse.json(
          { error: "Telefon raqam noto'g'ri formatda" },
          { status: 400 },
        );
      }

      // cooldown check
      const remain = await tempRepo.getCooldownRemaining(phone);
      if (remain > 0) {
        return NextResponse.json(
          { error: `Iltimos ${remain} soniya kuting`, retryAfterSec: remain },
          { status: 429, headers: { "Retry-After": String(remain) } },
        );
      }

      let sendRes: Record<string, unknown> | undefined;
      try {
        sendRes = (await sendVerificationMessage(phone)) as
          | Record<string, unknown>
          | undefined;
      } catch (gwErr) {
        // Network or unexpected gateway exception
        console.error("sendVerificationMessage threw", gwErr);
        return NextResponse.json(
          { error: "Xabar yuborishda tarmoq xatosi yuz berdi" },
          { status: 502 },
        );
      }

      if (sendRes && sendRes.ok === false) {
        const err = String(sendRes.error ?? "gateway_error");
        console.error("telegram gateway error for phone", phone, err, sendRes);
        // handle common errors similarly to register/init
        const floodMatch = /FLOOD_WAIT_(\d+)/i.exec(err);
        if (floodMatch) {
          const retryAfterSec = Number(floodMatch?.[1] || 5);
          await tempRepo.setCooldown(phone, retryAfterSec);
          return NextResponse.json(
            {
              error: `Juda tez-tez so'rov yuborildi. Iltimos ${retryAfterSec} soniya kuting`,
              retryAfterSec,
            },
            {
              status: 429,
              headers: { "Retry-After": String(Math.max(1, retryAfterSec)) },
            },
          );
        }
        return NextResponse.json(
          { error: "Gateway xatosi: tasdiqlash xabari yuborilmadi" },
          { status: 502 },
        );
      }

      const sendObj = sendRes as Record<string, unknown> | undefined;
      const requestId: string | undefined = sendObj
        ? String(
            sendObj.request_id ??
              sendObj.requestId ??
              (sendObj.data as Record<string, unknown> | undefined)
                ?.request_id ??
              (sendObj.data as Record<string, unknown> | undefined)?.requestId,
          )
        : undefined;
      if (!requestId)
        return NextResponse.json(
          { error: "Tasdiqlash kodini yuborib bo'lmadi" },
          { status: 500 },
        );

      // Store temp with action profileUpdate (passwordPlain empty since not used)
      const tempEntry: TempRegistration = {
        name,
        email,
        phone,
        requestId,
        createdAt: Date.now(),
        action: "profileUpdate",
        userId: user.id,
        passwordPlain: "",
      };
      await tempRepo.set(tempEntry);

      const res = NextResponse.json({ success: true, requestId, phone });
      try {
        const tempPayload = JSON.stringify({
          name,
          email,
          phone,
          requestId,
          userId: user.id,
          createdAt: Date.now(),
          action: "profileUpdate",
        });
        res.cookies.set(
          "reg_temp",
          Buffer.from(tempPayload).toString("base64"),
          { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 10 },
        );
      } catch {}
      return res;
    }

    return NextResponse.json(
      { error: "Hech qanday o'zgartirish amalga oshirilmadi" },
      { status: 400 },
    );
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("profile/update error", detail);
    return NextResponse.json(
      { error: "Ichki server xatosi", detail },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
