import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const t = url.searchParams.get("t");
        if (!t) return NextResponse.json({ error: "token required" }, { status: 400 });

        const r = getRedis();
        if (!r) return NextResponse.json({ error: "Redis disabled" }, { status: 500 });
        const key = `pay:demo:token:${t}`;
        const raw = await r.get(key);
        if (!raw) return NextResponse.json({ error: "invalid or expired token" }, { status: 404 });
        const data = JSON.parse(raw) as { kind: "order" | "reservation"; id: string };

        const prisma = getPrisma() as any;
        if (data.kind === "order") {
            await prisma.order.update({ where: { id: data.id }, data: { status: "paid" } });
            // Notify app views (best-effort)
            try { const bc = new BroadcastChannel('orders'); bc.postMessage({ type: 'orders:update' }); bc.close(); } catch { }
            // Invalidate per-user orders cache
            try { const r2 = getRedis(); if (r2) await r2.del(`orders:view:${(await prisma.order.findUnique({ where: { id: data.id }, select: { userId: true } })).userId}`); } catch { }
        } else if (data.kind === "reservation") {
            // For demo: mark reservation as paid in note JSON
            const resv = await prisma.reservation.findUnique({ where: { id: data.id } });
            if (resv) {
                const noteObj = resv.note ? (typeof resv.note === "string" ? JSON.parse(resv.note) : resv.note) : {};
                (noteObj as any).paid = true;
                (noteObj as any).paidAt = new Date().toISOString();
                // Persist as string to avoid Prisma JSON shape constraints
                await prisma.reservation.update({ where: { id: data.id }, data: { note: JSON.stringify(noteObj) } });
            }
            try { const bc = new BroadcastChannel('orders'); bc.postMessage({ type: 'orders:update' }); bc.close(); } catch { }
            try { const r2 = getRedis(); if (r2) await r2.del(`orders:view:${(await prisma.reservation.findUnique({ where: { id: data.id }, select: { userId: true } })).userId}`); } catch { }
        }

        // one-time token: delete after use
        await r.del(key);

        // Return a tiny HTML page for demo UX
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Paid</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0b1020;color:#fff"><div style="text-align:center"><h1>To'lov yakunlandi (demo)</h1><p>ID: ${data.id}</p><p>Uygulama oynasini tekshiring.</p></div></body></html>`;
        return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: "Server error", detail: msg }, { status: 500 });
    }
}
