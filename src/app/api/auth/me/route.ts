import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, refreshAccessToken } from '@/lib/jwtAuth';

export async function GET(req: NextRequest) {
  // Try access token
  const user = await getUserFromRequest(req);
  if (user) return NextResponse.json({ authenticated: true, user });

  // Try refresh to mint new access
  const res = NextResponse.next();
  const refreshed = await refreshAccessToken(req, res);
  if (refreshed?.user) {
    return NextResponse.json({ authenticated: true, user: refreshed.user, refreshed: true }, { headers: res.headers });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
