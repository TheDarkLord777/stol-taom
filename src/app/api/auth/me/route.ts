/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: Returns the current user if access token is valid. If only refresh exists, it may mint a new access token.
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                 user:
 *                   type: object
 *       401:
 *         description: Not authenticated
 */
import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TTL_SEC,
  ACCESS_TOKEN_NAME,
  REFRESH_TTL_SEC,
  REFRESH_TOKEN_NAME,
  getUserFromRequest,
  refreshAccessToken,
} from "@/lib/jwtAuth";

export async function GET(req: NextRequest) {
  try {
    // Try access token
    const user = await getUserFromRequest(req);
    if (user) return NextResponse.json({ authenticated: true, user });

    // Try refresh to mint new access (without using NextResponse.next in app routes)
    const refreshed = await refreshAccessToken(req);
    if (refreshed?.user) {
      const res = NextResponse.json({
        authenticated: true,
        user: refreshed.user,
        refreshed: true,
      });
      // Set cookies on this response
      const cookieSecureEnv = process.env.COOKIE_SECURE?.toLowerCase();
      const cookieSecure =
        cookieSecureEnv === "true"
          ? true
          : cookieSecureEnv === "false"
            ? false
            : process.env.NODE_ENV === "production";
      const base = {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: cookieSecure,
      };
      res.cookies.set(ACCESS_TOKEN_NAME, refreshed.access, {
        ...base,
        maxAge: ACCESS_TTL_SEC,
      });
      // Note: refreshAccessToken may have rotated refresh; since we didn't get the new token value here,
      // rotation on registry is optional and access is the critical cookie. If needed, we can extend the
      // function to return the rotated refresh token in the future.
      res.headers.set("x-auth-me", "refreshed");
      return res;
    }
    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (e: any) {
    return NextResponse.json(
      { authenticated: false, error: String(e?.message || e) },
      { status: 401 },
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
