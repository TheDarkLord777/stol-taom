import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import {
  ACCESS_TOKEN_NAME,
  REFRESH_TOKEN_NAME,
  verifyToken,
} from "@/lib/jwtAuth";

export async function GET(req: NextRequest) {
  const r = getRedis();
  if (!r) {
    return NextResponse.json({
      enableRedis: false,
      connected: false,
      message: "ENABLE_REDIS is not true or REDIS_URL missing",
    });
  }
  try {
    const pong = await r.ping();
    // For local dev only: list refresh keys with TTL
    const keys = await r.keys("auth:rt:*");
    const nowSec = Math.floor(Date.now() / 1000);
    const redisKeys = await Promise.all(
      keys.map(async (k) => ({ key: k, ttlSec: await r.ttl(k) })),
    );

    // Parse cookie tokens and show expiry details
    const accessRaw = req.cookies.get(ACCESS_TOKEN_NAME)?.value;
    const refreshRaw = req.cookies.get(REFRESH_TOKEN_NAME)?.value;

    const access = await (async () => {
      if (!accessRaw) return { present: false };
      try {
        const payload = await verifyToken(accessRaw);
        const exp = typeof payload.exp === "number" ? payload.exp : undefined;
        const ttlSec = exp ? Math.max(0, exp - nowSec) : undefined;
        return {
          present: true,
          valid: true,
          typ: payload.typ || "access",
          exp,
          expISO: exp ? new Date(exp * 1000).toISOString() : undefined,
          ttlSec,
        };
      } catch (e: any) {
        return { present: true, valid: false, error: String(e?.message || e) };
      }
    })();

    const refresh = await (async () => {
      if (!refreshRaw) return { present: false };
      try {
        const payload = await verifyToken(refreshRaw);
        const exp = typeof payload.exp === "number" ? payload.exp : undefined;
        const ttlSec = exp ? Math.max(0, exp - nowSec) : undefined;
        return {
          present: true,
          valid: true,
          typ: payload.typ || "refresh",
          jti: (payload as any)?.jti,
          exp,
          expISO: exp ? new Date(exp * 1000).toISOString() : undefined,
          ttlSec,
        };
      } catch (e: any) {
        return { present: true, valid: false, error: String(e?.message || e) };
      }
    })();

    return NextResponse.json({
      enableRedis: true,
      connected: pong === "PONG",
      redis: { keysCount: keys.length, keys: redisKeys },
      cookies: { access, refresh },
    });
  } catch (e: any) {
    return NextResponse.json(
      { enableRedis: true, connected: false, error: String(e?.message || e) },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
