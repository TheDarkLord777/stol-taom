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
    if (!t)
      return NextResponse.json({ error: "token required" }, { status: 400 });

    const r = getRedis();
    if (!r)
      return NextResponse.json({ error: "Redis disabled" }, { status: 500 });
    const key = `pay:demo:token:${t}`;
    const raw = await r.get(key);
    const ttl = await r.ttl(key).catch(() => -2);
    if (!raw || ttl <= 0) {
      // Show a friendly expired page and do NOT mark paid
      const html = `<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>QR muddati tugadi</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#111827;color:#fff;margin:0} .badge{display:inline-block;background:#ef4444;color:#fff;border-radius:9999px;padding:6px 10px;font-weight:700} .hint{margin-top:12px;color:#d1d5db}</style>
</head><body>
    <div style=\"text-align:center\">
        <div class=\"badge\">QR muddati tugadi</div>
        <p class=\"hint\">Iltimos, ilovada yangi QR yaratib qayta urining.</p>
    </div>
</body></html>`;
      return new NextResponse(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
        status: 410,
      });
    }
    const data = JSON.parse(raw) as {
      kind: "order" | "reservation";
      id: string;
    };

    const prisma = getPrisma() as any;
    if (data.kind === "order") {
      await prisma.order.update({
        where: { id: data.id },
        data: { status: "paid" },
      });
      // Notify app views (best-effort)
      try {
        const bc = new BroadcastChannel("orders");
        bc.postMessage({ type: "orders:update" });
        bc.close();
      } catch {}
      // Invalidate per-user orders cache
      try {
        const r2 = getRedis();
        if (r2)
          await r2.del(
            `orders:view:${(await prisma.order.findUnique({ where: { id: data.id }, select: { userId: true } })).userId}`,
          );
      } catch {}
    } else if (data.kind === "reservation") {
      // For demo: mark reservation as paid in note JSON
      const resv = await prisma.reservation.findUnique({
        where: { id: data.id },
      });
      if (resv) {
        const noteObj = resv.note
          ? typeof resv.note === "string"
            ? JSON.parse(resv.note)
            : resv.note
          : {};
        (noteObj as any).paid = true;
        (noteObj as any).paidAt = new Date().toISOString();
        // Persist as string to avoid Prisma JSON shape constraints
        await prisma.reservation.update({
          where: { id: data.id },
          data: { note: JSON.stringify(noteObj) },
        });
      }
      try {
        const bc = new BroadcastChannel("orders");
        bc.postMessage({ type: "orders:update" });
        bc.close();
      } catch {}
      try {
        const r2 = getRedis();
        if (r2)
          await r2.del(
            `orders:view:${(await prisma.reservation.findUnique({ where: { id: data.id }, select: { userId: true } })).userId}`,
          );
      } catch {}
    }

    // one-time token: delete after use
    await r.del(key);

    // Return a tiny HTML page for demo UX (with optional audio on scan)
    const audioUrl =
      process.env.QR_SUCCESS_AUDIO_URL || "/audio/qr-success.mp3";
    const html = `<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Paid</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0b1020;color:#fff;margin:0} .btn{background:#10b981;color:#fff;border:none;border-radius:8px;padding:10px 14px;font-weight:600;cursor:pointer} .row{margin-top:12px}</style>
</head><body>
    <div style=\"text-align:center\">
        <h1>To'lov yakunlandi (demo)</h1>
        <p>ID: ${data.id}</p>
        <p>Uygulama oynasini tekshiring.</p>
        <div class=\"row\">
            <audio id=\"qr-audio\" src=\"${audioUrl}\" preload=\"auto\" autoplay playsinline></audio>
            <button class=\"btn\" onclick=\"(async()=>{try{await document.getElementById('qr-audio').play()}catch(e){alert('Audio ijrosi bloklandi. Iltimos ruxsat bering yoki qayta urining.')}})()\">Ovoz ijro etish</button>
        </div>
    </div>
    <script>
        // Try autoplay politely; some browsers block without user gesture
        (async()=>{try{const a=document.getElementById('qr-audio');if(a){a.volume=1.0;await a.play()}}catch(e){/* ignore */}})();
    </script>
</body></html>`;
    return new NextResponse(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: msg },
      { status: 500 },
    );
  }
}
