import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/jwtAuth';

export async function POST() {
  const res = NextResponse.json({ success: true });
  clearAuthCookies(res);
  return res;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
