import { NextResponse } from 'next/server'
import { getSwaggerSpec } from '@/lib/openapi'

export const dynamic = 'force-dynamic'

function docsEnabled() {
  // Enable docs by default in development; require explicit flag in production
  return (
    process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === 'true'
  )
}

export async function GET() {
  if (!docsEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const spec = getSwaggerSpec()
  return NextResponse.json(spec)
}
