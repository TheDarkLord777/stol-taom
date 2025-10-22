import { NextResponse } from 'next/server'
import { listExistingEnvFiles } from '@/lib/envFiles'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function onlyDev() {
  return process.env.NODE_ENV !== 'production'
}

export async function GET() {
  if (!onlyDev()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const files = await listExistingEnvFiles()
  return NextResponse.json({ files })
}
