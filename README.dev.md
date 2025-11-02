# Development README

This file documents the safe `sync-deps` workflow and the guarded `prepare-install` wrapper used in this repository.

Why we have a separate `deps.dependencies.json`

- We keep a curated list of dependencies in `deps.dependencies.json` to make reviews and pruning easier.
- Changes to `deps.dependencies.json` are intentionally applied to `package.json` only after an explicit sync step.

Safe workflow (manual)

1. Edit `deps.dependencies.json` and set the dependency versions you want to manage.
2. Preview the planned changes locally (dry-run):

```powershell
node .\scripts\sync-deps.cjs --dry
```

3. If the diff looks correct, run the sync and then install:

```powershell
npm run sync-deps
npm install
```

- The sync script will create a timestamped backup of `package.json` (e.g. `package.json.bak.20251102...`).
- This keeps `package.json` authoritative while making diffs and reviews easier.

Guarded prepare-install (recommended)

- The repository's `package.json` `prepare-install` script now runs `node scripts/prepare-install.cjs`.
- The wrapper only runs the sync when the environment variable `SYNC_DEPS` is set to a truthy value (e.g. `1`, `true`, `yes`).
- This prevents accidental dependency overwrites during normal `npm install` runs or on CI unless explicitly opted-in.

Examples (cross-platform):

- Windows (PowerShell):

```powershell
$env:SYNC_DEPS = '1'; npm run prepare-install
# or one-liner
cmd /c "set SYNC_DEPS=1&& npm run prepare-install"
```

- Unix / macOS / Git Bash:

```bash
SYNC_DEPS=1 npm run prepare-install
```

Optional: automatic prepare-install in CI

If you want CI to sync dependencies automatically, set the `SYNC_DEPS` environment variable in your CI configuration before running `npm ci` or `npm install`.

Security note

- The sync script creates backups, but review diffs carefully before applying in CI.
- If you prefer to avoid automated syncing entirely, keep `prepare-install` disabled or do not set `SYNC_DEPS` in CI.

Troubleshooting

- If package.json becomes smaller than expected, look for a recent `package.json.bak.*` file in the repo root and restore.
- Run `node .\scripts\sync-deps.cjs --help` for usage information.

