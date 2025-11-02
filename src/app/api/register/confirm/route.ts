/**
 * @swagger
 * /api/register/confirm:
 *   post:
 *     summary: Confirm verification code and create user
 *     description: Verifies the code with the gateway, creates the user, and issues JWT cookies (access + refresh).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requestId:
 *                 type: string
 *               code:
 *                 type: string
 *             required: [requestId, code]
 *     responses:
 *       200:
 *         description: Registration confirmed and tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     name:
 *                       type: string
 *       400:
 *         description: Invalid code or request
 *       404:
 *         description: Pending registration not found
 *       410:
 *         description: Code expired
 *       429:
 *         description: Too many attempts
 *       5XX:
 *         description: Server error
 */
import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { issueAndSetAuthCookies } from "@/lib/jwtAuth";
import { type TempRegistration, TempStore } from "@/lib/store";
import { checkVerificationStatus } from "@/lib/telegramGateway";
import { tempRepo } from "@/lib/tempRepo";
import { userRepo } from "@/lib/userRepo";

function hashPassword(password: string) {
  // Use Node crypto scrypt as a light alternative; in real app, use bcrypt
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function _verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const verify = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(verify, "hex"),
  );
}

export async function POST(req: NextRequest) {
  try {
    const { requestId, code } = (await req.json()) as {
      requestId?: string;
      code?: string;
    };

    if (!requestId || !code) {
      return NextResponse.json(
        { error: "requestId va kod talab qilinadi" },
        { status: 400 },
      );
    }

    let temp = await tempRepo.getByRequestId(requestId);
    if (!temp) {
      // Fallback: read from cookie 'reg_temp'
      try {
        const cookie = req.cookies.get("reg_temp")?.value;
        if (cookie) {
          const raw = Buffer.from(cookie, "base64").toString("utf8");
          const parsed = JSON.parse(raw);
          if (parsed?.requestId === requestId && parsed?.phone) {
            temp = {
              name: parsed.name,
              phone: parsed.phone,
              passwordPlain: parsed.passwordPlain,
              requestId: parsed.requestId,
              createdAt: parsed.createdAt || Date.now(),
            } as TempRegistration;
          }
        }
      } catch {}
    }
    if (!temp) {
      return NextResponse.json(
        { error: "Ariza topilmadi yoki eskirgan" },
        { status: 404 },
      );
    }

    const verifyRes = (await checkVerificationStatus(requestId, code)) as
      | Record<string, unknown>
      | undefined;
    if (
      verifyRes &&
      verifyRes.ok === false &&
      typeof verifyRes.error === "string"
    ) {
      const m = /FLOOD_WAIT_(\d+)/i.exec(String(verifyRes.error));
      if (m) {
        const retryAfterSec = Number(m[1] || 0);
        return NextResponse.json(
          {
            error: `Juda tez-tez so'rov yuborildi. Iltimos ${retryAfterSec} soniya kuting`,
            retryAfterSec,
            detail: verifyRes,
          },
          {
            status: 429,
            headers: { "Retry-After": String(Math.max(1, retryAfterSec)) },
          },
        );
      }
    }
    const verifyObj = verifyRes as Record<string, unknown> | undefined;
    let vStatusRaw: unknown;
    if (verifyObj) {
      vStatusRaw =
        ((verifyObj.result as Record<string, unknown> | undefined)
          ?.verification_status as Record<string, unknown> | undefined) ??
        undefined;
      vStatusRaw =
        (
          (verifyObj.result as Record<string, unknown> | undefined)
            ?.verification_status as Record<string, unknown> | undefined
        )?.status ??
        (
          (verifyObj.data as Record<string, unknown> | undefined)
            ?.verification_status as Record<string, unknown> | undefined
        )?.status ??
        (verifyObj.verification_status as Record<string, unknown> | undefined)
          ?.status ??
        (verifyObj.status as unknown);
    }
    const vStatus: string | undefined =
      vStatusRaw === undefined ? undefined : String(vStatusRaw);
    const VERIFIED_STATES = new Set(["code_valid", "verified", "success"]);
    const INVALID_STATES = new Set(["code_invalid", "invalid"]);
    const EXPIRED_STATES = new Set(["code_expired", "expired"]);
    const PENDING_STATES = new Set(["pending", "code_sent"]);
    const isVerified =
      (verifyObj && verifyObj.verified === true) === true ||
      (verifyObj &&
        (verifyObj.data as Record<string, unknown> | undefined)?.verified ===
          true) === true ||
      ((verifyObj &&
        (verifyObj.result as Record<string, unknown> | undefined)?.status ===
          "verified") as boolean) ||
      VERIFIED_STATES.has(String(vStatus));
    if (!isVerified) {
      if (INVALID_STATES.has(String(vStatus))) {
        return NextResponse.json(
          { error: "Kod noto'g'ri", detail: verifyRes },
          { status: 400 },
        );
      }
      if (EXPIRED_STATES.has(String(vStatus))) {
        return NextResponse.json(
          {
            error: "Kod eskirgan. Qayta yuborishni so'rang",
            detail: verifyRes,
          },
          { status: 410 },
        );
      }
      if (PENDING_STATES.has(String(vStatus))) {
        return NextResponse.json(
          { error: "Kod hali tasdiqlanmagan", detail: verifyRes },
          { status: 409 },
        );
      }
      if (verifyRes?.ok === true) {
        // If ok but unknown status, accept as success to be resilient.
      } else {
        return NextResponse.json(
          { error: "Kodni tekshirishda xatolik", detail: verifyRes },
          { status: 400 },
        );
      }
    }

    // Create user if not exists
    const existing = await userRepo.getByPhone(temp.phone);
    if (existing) {
      // Already registered
      TempStore.deleteByRequestId(requestId);
      return NextResponse.json(
        { error: "Ushbu raqam allaqachon ro'yxatdan o'tgan" },
        { status: 409 },
      );
    }

    const passwordHash = hashPassword(temp.passwordPlain);
    const user = await userRepo.create({
      phone: temp.phone,
      name: temp.name,
      passwordHash,
    });

    // Issue JWT cookies (access + refresh)
    const res = NextResponse.json({
      success: true,
      user: { id: user.id, phone: user.phone, name: user.name },
    });
    await issueAndSetAuthCookies(res, {
      id: user.id,
      phone: user.phone,
      name: user.name,
    });
    // Clear temp
    await tempRepo.deleteByRequestId(requestId);
    // Clear temp cookie
    try {
      res.cookies.set("reg_temp", "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    } catch {}
    return res;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("register/confirm error", msg);
    return NextResponse.json(
      { error: "Ichki server xatosi", detail: String(msg) },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
