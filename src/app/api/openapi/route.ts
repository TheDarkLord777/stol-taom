import { NextResponse } from 'next/server'
import { getSwaggerSpec } from '@/lib/openapi'

export const dynamic = 'force-dynamic'

export async function GET() {
  const spec = getSwaggerSpec()
  return NextResponse.json(spec)
}
