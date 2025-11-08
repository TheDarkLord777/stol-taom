<!--
Repository-specific Copilot / code-assistant instructions.
Keep this short and actionable. These guidelines reflect the code style, conventions
and patterns already used in this repository (Next.js App Router + TypeScript + Tailwind).
-->

# Copilot instructions for stol-taom

Summary
- Language: TypeScript (>=5.x) running on Node.js (>=18). Frontend: React 19 (App Router).
- Framework: Next.js (App Router, files under `src/app`). Styling: Tailwind CSS v4.

What changed since this file was added
- The repo now includes standalone build/start helpers (`scripts/build-standalone.cjs`, `scripts/start-standalone.cjs`) and a `standalone` npm script to run a production-like server. The standalone runtime loads `.next/standalone/.env` and supports a dotenv pre-load in the start script.
- Dev-only admin UI and APIs are gated by `process.env.NODE_ENV !== 'production'` and explicit flags such as `AUTH_DEBUG_ENABLED` and `NEXT_PUBLIC_AUTH_DEBUG`. There is an optional `DEV_ADMIN_ENABLED` pattern used when you want to enable dev UI in a standalone run.
- Utility scripts added: `scripts/sync-deps.cjs` + `deps.dependencies.json` to help manage large dependency lists outside `package.json` if desired.
- Debug/UI helpers added: `AuthSessionTimer` (polls `/api/auth/debug`) and `CLSObserver` (logs layout-shift entries) to help debug auth/UX issues locally.
- New menu explorer UI: a restored Combobox-based explorer (`src/app/menu/ExplorerClient.tsx`) now sits above a responsive `MenuGrid` (`src/components/MenuGrid.tsx`). The page-level `src/app/menu/page.tsx` fetches `/api/menu` once and passes `items`/`loading` into both components to avoid duplicate network calls.
- `MenuGrid` responsibilities: fetch fallback (via `fetchUrl`), client-side substring filtering (accepts `query` prop), shimmer/loading skeletons, larger image area for cards, accepts `logoUrl`/`imageUrl`, and a fullscreen detail modal that fetches `/api/menu/:id` when opened.
- Combobox updates: `src/components/ui/combobox.tsx` now exposes `onQueryChange` so parents can react to live typing and filter the grid (uses substring `includes` matching by default).
- Modal & accessibility: the menu detail modal supports keyboard close (Escape), overlay click to close, and has role attributes. The modal expects a detail API at `/api/menu/[id]`; add that route or return useful fallback data server-side.
- next/image usage: many images use `fill`; add `sizes` when using `fill` and mark above-the-fold LCP images with `priority` to avoid dev-console warnings and improve performance.
- Auth/middleware changes: `src/lib/jwtAuth.ts` now centralizes auth rules (AuthControl). Middleware routes through `src/middleware.ts` call `authGuard(req)` and will now redirect authenticated requests to `/home` when they hit `/` or `/login`. Refresh rotation logic remains in `refreshAccessToken(req, res)` and `issueAndSetAuthCookies`.
- Login flow: the login page (`src/app/login/page.tsx`) now sends `credentials: 'same-origin'` with the fetch to ensure cookie acceptance, performs a full navigation (`window.location.href = '/home'`) after success to guarantee SSR/middleware sees cookies, and also includes a client-side `useEffect` check that calls `/api/auth/me` and runs `router.replace('/home')` for a smooth SPA-like redirect if already authenticated.

Coding style
- Follow existing patterns: PascalCase for React components, camelCase for variables and functions, UPPER_SNAKE for env names.
- Co-locate features under `src/` (e.g. `src/app/profile`, `src/components`). Prefer small modules and one exported symbol per file where practical.
- Use `async/await` and handle errors explicitly in network and I/O code. Prefer small, testable helper functions in `src/lib/`.

Formatting & linting
- Use project tools: `biome` is configured. Run `npm run format` and `npm run lint` before commits.
- Keep TypeScript types explicit on exported functions and API surfaces.

Next.js & React guidance
- App Router specifics:
  - Use `export const runtime = "nodejs"` or `"edge"` explicitly when required.
  - Use `export const dynamic = "force-dynamic"` for routes that must not be statically rendered.
- Client vs server:
  - Mark client components with `"use client"` only when necessary (DOM, hooks, state).
  - Prefer server components for data fetching and heavy logic when possible.

Auth & env patterns (critical)
- Auth helpers live in `src/lib/jwtAuth.ts`. Use `signAccessToken`, `refreshAccessToken`, `issueAndSetAuthCookies`, and `getUserFromRequest` consistently when issuing tokens and checking sessions.
- Cookie flags (Secure, httpOnly, SameSite) are derived from `process.env.COOKIE_SECURE`. For local dev ensure `COOKIE_SECURE=false` so cookies are sent over HTTP; otherwise secure cookies won't be set over plain HTTP and middleware will not see them.
- Middleware and routing: `src/middleware.ts` calls `authGuard(req)` which enforces `AuthControl`. The guard now redirects `/` and `/login` to `/home` for authenticated users (via access token or successful refresh). When testing, use browser devtools Network tab to confirm `Set-Cookie` headers and cookie flags.
- Client fetches that rely on Set-Cookie must use `credentials: 'same-origin'` (or appropriate cross-site credentials) so the browser accepts cookies set by the server.

Dev & standalone workflows
- Dev: run `npm run dev` to use Turbopack; all dev APIs (under `/dev`) are available.
- Standalone/Prod-like: use `npm run standalone` which runs the build helpers and starts `.next/standalone/server.js`.
  - Standalone start script preloads `.env.local`/`.env.production` using dotenv so env flags like `AUTH_DEBUG_ENABLED` can be provided for local debugging.

Testing
- Unit tests: target critical lib modules (`src/lib/jwtAuth.ts`, `src/lib/refreshRepo.ts`) and UI primitives under `src/components/ui/` using Vitest or Jest + React Testing Library.
- API tests: write small integration tests for route handlers using mocked Next.js Request/Response objects.
- For Redis/DB: use test doubles or dockerized local instances in CI; add `test:e2e` for optional integration runs.

CSS/Tailwind & frontend UX
- Tailwind is the default. Prefer utility-first classes. For repeated complex layouts extract small components and place shared CSS in `globals.css`.
- Avoid layout shift:
  - Reserve dimensions for images and hero blocks; use `next/image` with `priority` or background-image with fixed height.
  - Keep placeholders (ClientOnly fallbacks) sized identically to final content to avoid CLS.
  - Use `font-display: swap` for custom fonts and consider `preload` for critical fonts.
- Shimmer/skeleton helpers: `.shimmer` exists in `globals.css` — reuse it for loading placeholders.

VS Code and editor experience
- The repo includes `.vscode/settings.json` with recommended workspace settings: format on save, Tailwind support, TypeScript SDK path, and exclusions for `.next` and `node_modules`.

Practical tips and gotchas
- Env numeric values: do not include thousands separators (e.g., `REFRESH_TTL_SECONDS=21600`, not `21,600`).
- When rotating refresh JTIs with Redis, only rotate (delete old/add new) if you can also set the new refresh cookie for the client in the same response — otherwise the client will retain an invalidated refresh token and get logged out on next request. Use the helper `refreshAccessToken(req, res)` that accepts an optional response to set cookies.
- For quick token expiry testing, use `ACCESS_TTL_SECONDS` and `REFRESH_TTL_SECONDS` in `.env.local`.
- If you add dev-only UI, gate it behind `AUTH_DEBUG_ENABLED` or `DEV_ADMIN_ENABLED` so production remains safe.
- Menu UI notes: `MenuGrid` supports being passed `items` and `loading` from a parent to avoid duplicated fetches; prefer fetching once in the page and passing down. The grid also accepts `fetchUrl` when used standalone. The detail modal expects `/api/menu/[id]` — implement that API to provide restaurants and full description for a better UX.
- next/image notes: when using `fill`, always provide a `sizes` prop to suppress console warnings and improve layout/CPU; mark images that are LCP candidates with `priority`.

Commit & PR guidance
- Keep PRs small and focused. Describe intent, list changed files, and include manual verification steps.
- Document env changes in `.env.sample` or README when adding/removing important flags (auth, redis, cookies).

When in doubt
- Follow the nearest existing pattern. Reuse `src/components/ui/*` primitives and `src/lib/*` utilities.
- Prefer explicit, testable behavior over magic config. If you need to enable dev-only behavior in a non-dev environment, prefer an explicit `DEV_ADMIN_ENABLED` flag (must be documented and gated).

Thank you — keep changes small and testable.
