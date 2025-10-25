import fs from "fs/promises";
import path from "path";

export const ALLOWED_ENV_FILES = [
  ".env.local",
  ".env",
  ".env.production",
] as const;

export type EnvFileName = (typeof ALLOWED_ENV_FILES)[number];

function resolveEnvPath(file: EnvFileName) {
  return path.join(process.cwd(), file);
}

export async function listExistingEnvFiles(): Promise<EnvFileName[]> {
  const out: EnvFileName[] = [];
  for (const f of ALLOWED_ENV_FILES) {
    try {
      await fs.access(resolveEnvPath(f));
      out.push(f);
    } catch {}
  }
  return out;
}

export async function readEnvFile(
  file: EnvFileName,
): Promise<{ map: Record<string, string>; lines: string[]; eol: string }> {
  const p = resolveEnvPath(file);
  const raw = await fs.readFile(p, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  const map: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1);
      // strip surrounding quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      map[key] = value;
    }
  }
  return { map, lines, eol };
}

export async function writeEnvFile(
  file: EnvFileName,
  updates: Record<string, string | boolean>,
) {
  const { map, lines, eol } = await readEnvFile(file);
  // normalize update values to string
  const upd: Record<string, string> = {};
  for (const [k, v] of Object.entries(updates)) {
    upd[k] = typeof v === "boolean" ? (v ? "true" : "false") : String(v);
  }
  const seen = new Set<string>();
  const newLines = lines.map((line) => {
    const idx = line.indexOf("=");
    if (idx > 0 && !line.trim().startsWith("#")) {
      const key = line.slice(0, idx).trim();
      if (key in upd) {
        seen.add(key);
        return `${key}=${upd[key]}`;
      }
    }
    return line;
  });
  // append missing keys
  for (const [k, v] of Object.entries(upd)) {
    if (!seen.has(k)) newLines.push(`${k}=${v}`);
  }
  const content = newLines.join(eol);
  await fs.writeFile(resolveEnvPath(file), content, "utf8");
  return { content };
}
