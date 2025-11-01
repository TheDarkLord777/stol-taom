#!/usr/bin/env node
/*
 Build Next.js with output:standalone and copy required assets into the
 .next/standalone folder so server.js can serve them correctly.
 This avoids broken styles/fonts when running `node .next/standalone/server.js`.
*/

const { spawnSync } = require("node:child_process");
const { existsSync, mkdirSync, cpSync } = require("node:fs");
const { join } = require("node:path");

process.env.NEXT_STANDALONE = "true";

console.log("[standalone] Building Next.js with NEXT_STANDALONE=true ...");
// Call the local Next.js binary directly to avoid nested npm invocation issues
let cmd;
let args;
let nextBin =
  process.platform === "win32"
    ? join(process.cwd(), "node_modules", ".bin", "next.cmd")
    : join(process.cwd(), "node_modules", ".bin", "next");
// Use npx to invoke next for better cross-platform behavior
cmd = process.platform === "win32" ? "npx.cmd" : "npx";
args = ["next", "build"];
const { execSync } = require('node:child_process');
try {
  const cmdStr = `${cmd} ${args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`;
  const out = execSync(cmdStr, { env: process.env, stdio: 'pipe', encoding: 'utf8', maxBuffer: 1024 * 1024 * 5 });
  if (out) console.log(out);
} catch (err) {
  console.error('[standalone] Build failed. Aborting.');
  try {
    console.error(err.stdout ? '--- stdout ---\n' + err.stdout : '');
    console.error(err.stderr ? '--- stderr ---\n' + err.stderr : err.message || err);
  } catch (e) {
    console.error(err);
  }
  process.exit(1);
}

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");
const staticSrc = join(root, ".next", "static");
const staticDest = join(standaloneDir, ".next", "static");
const publicSrc = join(root, "public");
const publicDest = join(standaloneDir, "public");

if (!existsSync(standaloneDir)) {
  console.error(
    '[standalone] Error: .next/standalone not found. Ensure next.config.ts sets output:"standalone" when NEXT_STANDALONE=true.',
  );
  process.exit(1);
}

// Ensure .next under standalone exists
const nestedNext = join(standaloneDir, ".next");
if (!existsSync(nestedNext)) mkdirSync(nestedNext, { recursive: true });

// Copy .next/static → .next/standalone/.next/static
if (existsSync(staticSrc)) {
  console.log(
    "[standalone] Copying .next/static → .next/standalone/.next/static",
  );
  mkdirSync(staticDest, { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
} else {
  console.warn("[standalone] Warning: .next/static not found.");
}

// Copy public → .next/standalone/public
if (existsSync(publicSrc)) {
  console.log("[standalone] Copying public → .next/standalone/public");
  mkdirSync(publicDest, { recursive: true });
  cpSync(publicSrc, publicDest, { recursive: true });
} else {
  console.log("[standalone] No public directory to copy.");
}

console.log(
  "[standalone] Done. You can now run: node .next/standalone/server.js",
);
