#!/usr/bin/env node
const { existsSync, mkdirSync, cpSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");
const staticSrc = join(root, ".next", "static");
const staticDest = join(standaloneDir, ".next", "static");
const publicSrc = join(root, "public");
const publicDest = join(standaloneDir, "public");

if (!existsSync(standaloneDir)) {
  console.error(
    "[standalone-copy] Error: .next/standalone not found. Build with NEXT_STANDALONE=true first.",
  );
  process.exit(1);
}

const nestedNext = join(standaloneDir, ".next");
if (!existsSync(nestedNext)) mkdirSync(nestedNext, { recursive: true });

if (existsSync(staticSrc)) {
  console.log(
    "[standalone-copy] Copying .next/static → .next/standalone/.next/static",
  );
  mkdirSync(staticDest, { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
} else {
  console.warn(
    "[standalone-copy] Warning: .next/static not found. Did the build complete?",
  );
}

if (existsSync(publicSrc)) {
  console.log("[standalone-copy] Copying public → .next/standalone/public");
  mkdirSync(publicDest, { recursive: true });
  cpSync(publicSrc, publicDest, { recursive: true });
} else {
  console.log("[standalone-copy] No public directory to copy.");
}

console.log(
  "[standalone-copy] Done. Start with: node .next/standalone/server.js",
);
