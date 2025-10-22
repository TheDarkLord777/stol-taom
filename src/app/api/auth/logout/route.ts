/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     description: Revokes refresh token (if registry enabled) and clears auth cookies.
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  REFRESH_TOKEN_NAME,
  clearAuthCookies,
  verifyToken,
} from "@/lib/jwtAuth";

export async function POST() {
  const res = NextResponse.json({ success: true });
  try {
    const cookieStore = await cookies();
    const rt = cookieStore.get(REFRESH_TOKEN_NAME)?.value;
    if (rt) {
      const payload = await verifyToken(rt);
      const jti = (payload as any)?.jti ? String((payload as any).jti) : "";
      if (jti) {
        try {
          const mod = await import("@/lib/refreshRepo");
          await (mod as any).refreshRepo.revoke(jti);
        } catch {}
      }
    }
  } catch {
    // ignore
  }
  clearAuthCookies(res);
  return res;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
