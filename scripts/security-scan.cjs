#!/usr/bin/env node
/*
  Lightweight Security Scanner for Next.js App Router repo
  - Scans for:
    * Missing security headers in next.config.ts
    * Missing CSRF token/origin checks for mutating API routes
    * JWT cookie flags (httpOnly, secure, sameSite)
    * Rate limiting presence on auth endpoints
    * Dangerous patterns: dangerouslySetInnerHTML, innerHTML, eval, new Function
    * Wildcard CORS
    * Swagger/docs gating via ENABLE_API_DOCS
    * JWT_SECRET usage

  Exits with code 0 to avoid blocking CI by default. Prints a summary report.
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', '.turbo', '.vercel', 'dist', 'build', '.cache']);
const INCLUDE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json']);

/** Walk directory and collect files */
function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (IGNORE_DIRS.has(ent.name)) continue;
      out.push(...walk(p));
    } else {
      const ext = path.extname(ent.name);
      if (INCLUDE_EXT.has(ext)) out.push(p);
    }
  }
  return out;
}

function safeRead(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function addIssue(issues, severity, message, file, line = null) {
  issues.push({ severity, message, file: file ? path.relative(ROOT, file) : null, line });
}

function grep(content, regex) {
  const lines = content.split(/\r?\n/);
  const matches = [];
  lines.forEach((line, idx) => {
    if (regex.test(line)) matches.push({ idx: idx + 1, line });
  });
  return matches;
}

function scan() {
  const files = walk(ROOT);
  const byPath = new Map(files.map(f => [f, safeRead(f)]));
  const issues = [];

  // 1) Security headers in next.config.ts
  const nextCfgPath = path.join(ROOT, 'next.config.ts');
  if (fs.existsSync(nextCfgPath)) {
    const cfg = safeRead(nextCfgPath);
    const hasHeadersFn = /\bheaders\s*:\s*async\s*\(\)\s*=>|\basync\s*headers\s*\(/.test(cfg) || /export\s+async\s+function\s+headers\s*\(/.test(cfg);
    const requiredHeaders = ['Content-Security-Policy', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'X-Content-Type-Options'];
    if (!hasHeadersFn) {
      addIssue(issues, 'high', 'Security headers not configured in next.config.ts (headers()). Add CSP, XFO, Referrer-Policy, Permissions-Policy, X-Content-Type-Options.', nextCfgPath);
    } else {
      for (const h of requiredHeaders) {
        if (!cfg.includes(h)) {
          addIssue(issues, 'high', `Header missing in next.config.ts: ${h}`, nextCfgPath);
        }
      }
    }
  } else {
    addIssue(issues, 'high', 'next.config.ts not found; cannot verify security headers.', null);
  }

  // 2) CSRF protection for mutating routes: look for any mention of csrf or origin checks
  const hasCsrfMention = Array.from(byPath.values()).some(v => /csrf|x-csrf-token/i.test(v));
  const middlewarePath = path.join(ROOT, 'middleware.ts');
  const middlewareContent = fs.existsSync(middlewarePath) ? safeRead(middlewarePath) : '';
  const checksOriginOrReferer = /(request\.headers\.get\(['"](origin|referer)['"]\))/i.test(middlewareContent) || /new\s+URL\(/.test(middlewareContent);
  if (!hasCsrfMention && !checksOriginOrReferer) {
    addIssue(issues, 'high', 'No CSRF token or origin/referer checks detected for mutating requests. Consider adding CSRF protection in middleware for POST/PUT/PATCH/DELETE.', 'middleware.ts');
  }

  // 3) Cookie flags for JWT: look for httpOnly, secure, sameSite
  const jwtPath = path.join(ROOT, 'src', 'lib', 'jwtAuth.ts');
  const jwtContent = fs.existsSync(jwtPath) ? safeRead(jwtPath) : '';
    if (jwtContent) {
      if (!/httpOnly\s*:\s*true/.test(jwtContent)) addIssue(issues, 'high', 'JWT cookies should be httpOnly: true', jwtPath);
      const secureOk = /secure\s*:\s*true/.test(jwtContent) || /secure\s*:\s*process\.env\.NODE_ENV\s*===\s*["']production["']/.test(jwtContent);
      if (!secureOk) addIssue(issues, 'high', 'JWT cookies should be secure: true (or gated by NODE_ENV === "production")', jwtPath);
      if (!/sameSite\s*:\s*['"](lax|strict)['"]/i.test(jwtContent)) addIssue(issues, 'high', 'JWT cookies should set sameSite: "lax" or "strict"', jwtPath);
    } else {
    // Fallback generic cookie search
    for (const [file, content] of byPath.entries()) {
      if (!/cookies\(\)\.set\(/.test(content)) continue;
      if (!/httpOnly\s*:\s*true/.test(content)) addIssue(issues, 'high', 'Cookie set without httpOnly: true', file);
      if (!/secure\s*:\s*true/.test(content)) addIssue(issues, 'high', 'Cookie set without secure: true', file);
      if (!/sameSite\s*:\s*['"](lax|strict)['"]/i.test(content)) addIssue(issues, 'high', 'Cookie set without sameSite: "lax" or "strict"', file);
    }
  }

  // 4) Rate limiting presence: check deps and code mentions
  const pkgJsonPath = path.join(ROOT, 'package.json');
  let pkg = {};
  try { pkg = JSON.parse(safeRead(pkgJsonPath) || '{}'); } catch {}
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const hasRateLimitDep = Object.keys(deps).some(d => /(rate[- ]?limit|upstash|lru|bottleneck)/i.test(d));
  const rateInCode = Array.from(byPath.values()).some(v => /rate\s*limit|ratelimit/i.test(v));
  if (!hasRateLimitDep && !rateInCode) {
    addIssue(issues, 'medium', 'No rate limiting detected. Add a simple limiter for login and other sensitive endpoints.', 'package.json');
  }

  // 5) Dangerous patterns
  for (const [file, content] of byPath.entries()) {
    if (!file.startsWith(path.join(ROOT, 'src'))) continue;
    const dsi = grep(content, /dangerouslySetInnerHTML/);
    for (const m of dsi) addIssue(issues, 'high', 'dangerouslySetInnerHTML usage detected. Ensure content is sanitized.', file, m.idx);
    const innerHTML = grep(content, /\.innerHTML\s*=|innerHTML\s*:/);
    for (const m of innerHTML) addIssue(issues, 'high', 'innerHTML assignment detected. Avoid or sanitize input.', file, m.idx);
    const evals = grep(content, /\beval\s*\(/);
    for (const m of evals) addIssue(issues, 'high', 'eval() detected. Avoid using eval.', file, m.idx);
    const newFn = grep(content, /new\s+Function\s*\(/);
    for (const m of newFn) addIssue(issues, 'high', 'new Function() detected. Avoid dynamic code execution.', file, m.idx);
  }

  // 6) CORS wildcard
  for (const [file, content] of byPath.entries()) {
    const corsAny = grep(content, /Access-Control-Allow-Origin\s*:\s*['"]\*/);
    for (const m of corsAny) addIssue(issues, 'high', 'CORS wildcard (*) detected. Restrict origins in production.', file, m.idx);
  }

  // 7) Swagger gating
  const hasSwagger = Array.from(byPath.values()).some(v => /next-swagger-doc|swagger-ui-react/i.test(v));
  const hasDocsEnvGate = Array.from(byPath.values()).some(v => /ENABLE_API_DOCS/i.test(v));
  if (hasSwagger && !hasDocsEnvGate) {
    addIssue(issues, 'medium', 'Swagger detected but not gated by ENABLE_API_DOCS.', null);
  }

  // 8) JWT_SECRET presence
  const hasJwtSecret = Array.from(byPath.values()).some(v => /JWT_SECRET/.test(v));
  if (!hasJwtSecret) addIssue(issues, 'info', 'JWT_SECRET not referenced in code. Ensure tokens use a strong secret from env.', null);

  return issues;
}

function main() {
  const issues = scan();
  const groups = { high: [], medium: [], info: [] };
  for (const i of issues) groups[i.severity].push(i);

  const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);

  const printGroup = (name, arr) => {
    if (!arr.length) return;
    console.log(`\n=== ${name.toUpperCase()} (${arr.length}) ===`);
    for (const i of arr) {
      const loc = [i.file, i.line ? `:${i.line}` : ''].filter(Boolean).join('');
      console.log(`- ${i.message}${loc ? `\n  at ${loc}` : ''}`);
    }
  };

  console.log('Security scan report');
  console.log(`Root: ${ROOT}`);
  printGroup('high', groups.high);
  printGroup('medium', groups.medium);
  printGroup('info', groups.info);

  if (!issues.length) {
    console.log('\nNo issues detected.');
  } else {
    console.log(`\nSummary: high=${groups.high.length}, medium=${groups.medium.length}, info=${groups.info.length}`);
  }

  // do not fail build by default
  process.exitCode = 0;
}

main();
