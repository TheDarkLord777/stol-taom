import { NextResponse } from "next/server";
import { getRedis, listKeys, ttl, delKeys, setLastSync } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const r = getRedis();
    if (!r) return NextResponse.json({ enabled: false, message: "Redis not configured" }, { status: 200 });

    try {
        const keys = await listKeys("*");
        const items = await Promise.all(
            keys.map(async (k) => ({ key: k, ttlSec: await ttl(k) }))
        );
        const lastSyncRaw = await r.get("meta:last_sync");
        const lastSync = lastSyncRaw ? Number(lastSyncRaw) : null;
        return NextResponse.json({ enabled: true, keys: items, lastSync }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ enabled: true, error: String(err) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string | undefined;
    const key = body.key as string | undefined;

    const r = getRedis();
    if (!r) return NextResponse.json({ ok: false, message: "Redis not configured" }, { status: 400 });

    try {
        if (action === "delete" && key) {
            await delKeys(key);
            await setLastSync();
            return NextResponse.json({ ok: true });
        }

        if (action === "refresh" && key) {
            // currently only support refreshing restaurant menu keys of the form menu:restaurants:v:<ver>
            if (key.startsWith("menu:restaurants")) {
                const rows = await prisma.restaurant.findMany({ orderBy: { name: "asc" } });
                const payload = rows.map((r) => ({ id: r.id, name: r.name, logoUrl: r.logoUrl ?? undefined, createdAt: r.createdAt.getTime() }));
                const ttlMs = Number(process.env.MENU_CACHE_TTL_MS ?? 3 * 24 * 60 * 60 * 1000);
                await r.set(key, JSON.stringify(payload), "PX", ttlMs);
                await setLastSync();
                return NextResponse.json({ ok: true });
            }
            return NextResponse.json({ ok: false, message: "refresh not supported for this key" }, { status: 400 });
        }

        return NextResponse.json({ ok: false, message: "unknown action" }, { status: 400 });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
