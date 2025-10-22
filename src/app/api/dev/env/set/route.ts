import { NextRequest, NextResponse } from 'next/server'
import { ALLOWED_ENV_FILES, writeEnvFile, readEnvFile } from '@/lib/envFiles'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function onlyDev() {
  return process.env.NODE_ENV !== 'production'
}

export async function POST(req: NextRequest) {
  if (!onlyDev()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = (await req.json()) as { file?: string; updates?: Record<string, string | boolean> }
  const file = body.file as (typeof ALLOWED_ENV_FILES)[number]
  const updates = body.updates || {}
  if (!file || !ALLOWED_ENV_FILES.includes(file)) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  }
  try {
    await writeEnvFile(file, updates)
    const { map } = await readEnvFile(file)
    return NextResponse.json({ file, values: map })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
