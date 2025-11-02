#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const path = require("node:path");

// Guarded prepare-install helper. Only runs sync-deps if SYNC_DEPS environment variable is truthy.
// This prevents accidental dependency shrinking during normal `npm install` runs.

const syncScript = path.join(process.cwd(), "scripts", "sync-deps.cjs");

function truthyEnv(name) {
  const v = process.env[name];
  if (!v) return false;
  return ["1", "true", "yes", "on"].includes(String(v).toLowerCase());
}

if (!truthyEnv("SYNC_DEPS")) {
  console.log(
    "SYNC_DEPS is not set or false. Skipping deps sync. To run sync, set SYNC_DEPS=1 and re-run `npm run prepare-install`.",
  );
  process.exit(0);
}

console.log("SYNC_DEPS is set. Running scripts/sync-deps.cjs...");
const res = spawnSync(process.execPath, [syncScript], { stdio: "inherit" });
if (res.error) {
  console.error("Failed to run sync-deps:", res.error);
  process.exit(1);
}
process.exit(res.status || 0);
