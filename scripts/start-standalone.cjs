#!/usr/bin/env node
// Start Next.js standalone server from the standalone directory and load env files from project root.
const { existsSync } = require('node:fs');
const { join } = require('node:path');

const root = process.cwd();
// Load environment variables from root .env files before chdir
try {
  const dotenv = require('dotenv');
  // Prefer .env.local for dev, fallback to .env.production if present
  const envLocal = join(root, '.env.local');
  const envProd = join(root, '.env.production');
  if (existsSync(envLocal)) dotenv.config({ path: envLocal });
  if (existsSync(envProd)) dotenv.config({ path: envProd });
} catch {}

const standaloneDir = join(root, '.next', 'standalone');
const serverPath = join(standaloneDir, 'server.js');
if (!existsSync(serverPath)) {
  console.error('[start-standalone] Error: .next/standalone/server.js not found. Run `npm run build:standalone` first.');
  process.exit(1);
}

// Change working directory so server can resolve relative assets correctly
process.chdir(standaloneDir);

require(serverPath);
