import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { forgotRepo } from "@/lib/forgotRepo";
import { checkVerificationStatus } from "@/lib/telegramGateway";
import { getPrisma } from "@/lib/prisma";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function hashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

export async function POST(req: NextRequest) {
    try {
        const { requestId, code, newPassword } = (await req.json()) as {
            requestId?: string;
            code?: string;
            newPassword?: string;
        };
        if (!requestId || !code || !newPassword) {
            return NextResponse.json({ error: "requestId, code va yangi parol talab qilinadi" }, { status: 400 });
        }
        if (newPassword.length < 6) {
            return NextResponse.json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" }, { status: 400 });
        }

        const rec = await forgotRepo.getByRequestId(requestId);
        if (!rec || !rec.userId) {
            return NextResponse.json({ error: "So'rov topilmadi yoki muddati o'tgan" }, { status: 404 });
        }

        const verifyRes = (await checkVerificationStatus(requestId, code)) as Record<string, unknown> | undefined;
        // re-use verification status parsing similar to registration flow
        const VERIFIED_STATES = new Set(["code_valid", "verified", "success"]);
        const INVALID_STATES = new Set(["code_invalid", "invalid"]);
        const EXPIRED_STATES = new Set(["code_expired", "expired"]);
        const PENDING_STATES = new Set(["pending", "code_sent"]);

        let vStatusRaw: unknown;
        if (verifyRes) {
            vStatusRaw = ((verifyRes.result as Record<string, unknown> | undefined)?.status) ?? (verifyRes.status as unknown) ?? undefined;
        }
        const vStatus: string | undefined = vStatusRaw === undefined ? undefined : String(vStatusRaw);

        const isVerified = (verifyRes && verifyRes.verified === true) === true || VERIFIED_STATES.has(String(vStatus));
        if (!isVerified) {
            if (INVALID_STATES.has(String(vStatus))) return NextResponse.json({ error: "Kod noto'g'ri" }, { status: 400 });
            if (EXPIRED_STATES.has(String(vStatus))) return NextResponse.json({ error: "Kod eskirgan" }, { status: 410 });
            if (PENDING_STATES.has(String(vStatus))) return NextResponse.json({ error: "Kod hali tasdiqlanmagan" }, { status: 409 });
            if (verifyRes?.ok === true) {
                // accept unknown ok as verified for resilience
            } else {
                return NextResponse.json({ error: "Kodni tekshirishda xatolik", detail: verifyRes }, { status: 400 });
            }
        }

        // Update password
        const prisma = getPrisma();
        const passwordHash = hashPassword(newPassword);
        await prisma.user.update({ where: { id: rec.userId }, data: { passwordHash } });

        // cleanup
        await forgotRepo.deleteByRequestId(requestId);

        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("forgot/verify error", msg);
        return NextResponse.json({ error: "Server error", detail: msg }, { status: 500 });
    }
}
