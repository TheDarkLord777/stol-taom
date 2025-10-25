import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_ENV_FILES, readEnvFile } from "@/lib/envFiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function onlyDev() {
  return process.env.NODE_ENV !== "production";
}

export async function GET(req: NextRequest) {
  if (!onlyDev())
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file") as
    | (typeof ALLOWED_ENV_FILES)[number]
    | null;
  if (!file || !ALLOWED_ENV_FILES.includes(file)) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }
  try {
    const { map } = await readEnvFile(file);
    return NextResponse.json({ file, values: map });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 },
    );
  }
}
