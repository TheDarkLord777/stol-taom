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

Dev admin: Ingredients & Restaurants
-----------------------------------

This project now includes a small dev/admin UI for managing menu-item ingredients and restaurant assignments.

- Page: `/dev/ingredients` (server component loads data via Prisma and passes to a client admin UI)
- API endpoints used by the admin UI:
	- `GET /api/menu/{id}/ingredients` — returns ingredients for a menu item
	- `POST /api/menu/{id}/ingredients` — replace ingredients for a menu item (body: `{ ingredients: [{ name, mandatory }] }`)
	- `POST /api/menu/{id}/restaurants` — replace restaurant assignments for a menu item (body: `{ restaurantIds: ["id1","id2"] }`)

How to use:

1. Run the Prisma migrations (if you haven't already):

```powershell
npx prisma migrate dev --name add-ingredients
npx prisma migrate dev --name add-menuitem-restaurants
npx prisma generate
```

2. Start the dev server and open http://localhost:3000/dev/ingredients

3. Edit ingredients and restaurant assignments in the modal; Save will call the API endpoints and update the database.

Notes:

- The admin page is intended for development only (it's under `/dev`). Make sure it's not exposed in production unless explicitly enabled.
- The endpoints currently perform replace semantics: POST replaces all existing ingredients/assignments for the menu item. If you need partial updates, we can extend the API.

