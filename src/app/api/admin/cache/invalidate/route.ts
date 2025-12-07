import { NextResponse } from "next/server";
import { invalidateMenuListCache } from "@/lib/menuRepo";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    // protect in production unless explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.ADMIN_CACHE_STATUS_ENABLED !== '1') {
        return NextResponse.json({ error: 'disabled' }, { status: 403 });
    }

    try {
        await invalidateMenuListCache();
        return NextResponse.json({ ok: true });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('/api/admin/cache/invalidate error', err);
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
