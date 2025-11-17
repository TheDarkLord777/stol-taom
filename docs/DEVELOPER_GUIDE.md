# Developer Guide — stol-taom frontend

This short cheatsheet collects the project's conventions, examples and quick recipes so new features (components, API routes, Prisma models) follow the repo style.

Keep this file up-to-date when conventions change.

## Quick facts
- Framework: Next.js (App Router) + React 19
- Language: TypeScript
- Styling: Tailwind CSS v4 utility classes
- ORM: Prisma (PostgreSQL)
- Lint/Format: Biome (`npm run lint`, `npm run format`)
- API docs: `next-swagger-doc` scans `src/app/api` JSDoc blocks -> `/api/openapi`

## Where to put code
- Pages & routes: `src/app/...`
  - Server components by default (no `"use client"`).
  - Client components must include `"use client"` at the top.
- API routes: `src/app/api/<path>/route.ts`
- Shared UI: `src/components/*` and primitives in `src/components/ui/*`.
- Business logic / DB: `src/lib/*` (e.g., `prisma.ts`, repositories).
- Prisma schema: `prisma/schema.prisma`, migrations in `prisma/migrations/`.
- Dev-only pages: `src/app/dev/*` (do not expose in production unless intentional).

## Naming & style rules (follow these)
- React components: `PascalCase` (e.g., `MenuGrid`, `IngredientsAdminClient`).
- Variables & functions: `camelCase`.
- Files: kebab or camel-case is fine but follow existing style in folder.
- Exports: give explicit TypeScript types for exported functions / handlers.
- Only access Prisma from server code (API routes or server components) using `getPrisma()` from `src/lib/prisma.ts`.

## Creating an API route (example)
Create `src/app/api/menu/[id]/ingredients/route.ts` with typed handlers and optional Swagger JSDoc for docs:

```ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/menu/{id}/ingredients:
 *   get:
 *     summary: Get ingredients for a menu item
 */
export async function GET(req: NextRequest) {
  const id = /* extract id from req.url */;
  const prisma = getPrisma();
  const rows = await prisma.ingredient.findMany({ where: { menuItemId: id } });
  return NextResponse.json({ ingredients: rows });
}
```

Notes:
- Use `NextResponse.json(...)` to return JSON.
- Add `@swagger` JSDoc blocks so `next-swagger-doc` includes the endpoint in `/api/openapi`.

## Creating a server page / component
- Server page (data fetched on server): `src/app/menu/page.tsx`
- Example server page that fetches menu items via a repo (server-side):

```tsx
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const items = await menuRepo.list();
  return (
    <div>
      <MenuGrid items={items} />
    </div>
  );
}
```

## Creating a client component
- Add `"use client"` at the top and use React hooks.
- Place UI primitives in `src/components` and reuse `src/components/ui/*` prefabs.

```tsx
"use client";
import React from 'react';

export default function MyClientComp() {
  const [state, setState] = React.useState(0);
  return <div>{state}</div>;
}
```

## Using the existing Combobox (typeahead)
- Use `src/components/ui/combobox.tsx` — supports `mode="input"` (inline input) and `mode="button"` (popover trigger).
- Pass `options: { value,label }[]`, `value`, `onChange`, and `onQueryChange` for live typing.

## Prisma schema changes & migrations
1. Edit `prisma/schema.prisma`.
2. Run migration locally and generate client:

```powershell
npx prisma migrate dev --name your-change
npx prisma generate
```

3. Restart dev server if it's running.

## OpenAPI docs
- Add `@swagger` JSDoc blocks in route files under `src/app/api`.
- Visit `/docs` (served by Swagger UI) to view docs from `/api/openapi`.

## Testing changes locally
- Start dev server: `npm run dev`
- Lint & format: `npm run lint`, `npm run format`
- Prisma client: `npx prisma generate`

## Example: add a new feature flow (API + frontend)
1. Add Prisma migration if DB model required.
2. Add API routes under `src/app/api/...` (with JSDoc for docs).
3. Add server page under `src/app/...` or add client component under `src/components`.
4. Reuse primitives from `src/components/ui` (e.g., `Combobox`, `Button`).
5. Run migrations, `npx prisma generate`, then `npm run dev` and test.
6. Run `npm run format` and `npm run lint` before committing.

## Common patterns & gotchas
- Only call Prisma from server code (avoid bundling Prisma into client).
- Use `next/image` with `sizes` when using `fill` to avoid LCP warnings.
- Keep dev-only pages under `src/app/dev` and gate production behavior with env flags.

## Where to ask if unsure

## Migration note: Cart idempotency (developer steps)

If you've just added `clientItemId` to the `CartItem` model (for idempotent client-side adds), follow these steps locally on Windows:

1. Stop the dev server (e.g., close the terminal running `npm run dev`).
2. Create and apply a migration and regenerate the client:

```powershell
npx prisma migrate dev --name add_cart_clientid
npx prisma generate
```

3. Restart the dev server: `npm run dev`.

Notes:
- On Windows you may see EPERM file rename errors from the Prisma engine if the dev server is running. Stopping the server typically resolves this.
- After the migration, remove any temporary `as any` Prisma client casts in server code and run `npm run build` to confirm types are correct.
- The server `POST /api/cart/add` now accepts a `clientId` in the request body and will avoid creating duplicate items for the same cart when present.

If you want, I can run these steps for you now (I will need you to stop the dev server if it's running).
- Check `src/components/ui` for reusable patterns.
- Look at `src/lib/*` for repo patterns (menuRepo, restaurantRepo).

---

If you'd like, I can also add a small commit-msg template or a checklist for PRs that references this guide. Follow these rules for all future code suggestions and I will generate code consistent with them.

## Recent Changes (quick reference)

This project has had several UI and infra updates. When working in these areas, please follow the notes below.

- Theme & per-page theme persistence
  - Per-page theme settings are persisted in `localStorage` under the key `page-themes`.
  - The hook `src/lib/use-page-theme.ts` now uses `useLayoutEffect` to apply a page's theme synchronously before paint to avoid flicker or mismatch between input/dropdown colors on first render.
  - `src/app/profile/ThemeManager.tsx` was updated to load saved page themes before writing defaults and to apply toggles immediately for the current page.
  - When reading/writing page-theme values from JSON, code uses explicit casts to `PageThemeConfig[]` to satisfy TypeScript. Prefer validating the saved shape when you need stricter guarantees.

- Combobox (cmdk + radix popover)
  - `src/components/ui/combobox.tsx` was made theme-aware and more robust during hydration: it resolves theme from context and falls back to `document.documentElement` classes to determine `light` vs `dark` when hydrating.
  - Input and popover/list styles are explicitly chosen based on the resolved theme to avoid mismatched dropdown backgrounds in light mode.
  - The Combobox supports both `mode="input"` and `mode="button"`; pages can pass `inputClassName` for exact control of the input styling when necessary.

- Reservation page UI
  - `src/app/reservation/ReservationClient.tsx` now presents restaurants as a grid of `TiltedCard` cards (see `src/components/ui/TiltedCard.tsx`). Clicking a card opens a modal that reuses existing reservation controls (date pickers, availability checks, party-size selection, submit flow).
  - A `Combobox` was added under the Reservation header to allow text search as an alternative to the card grid.

- Menu grid & Tilted cards
  - `src/components/MenuGrid.tsx` uses `TiltedCard` for menu visuals and a full-screen detail modal for item details, ingredients, and adding to cart.
  - The add-to-cart flow now attempts server add, falls back to offline enqueue + sync, and finally falls back to a local `addToCart` write. Each successful outcome triggers a `sonner` toast.

- Sonner Toasts
  - `sonner` is used for user-facing notifications (success toasts). Pages that show toasts should mount a `Toaster` (e.g. `src/app/menu/MenuPageClient.tsx` and `src/app/reservation/ReservationClient.tsx` currently mount one). For consistency, consider adding a single global `<Toaster />` in `src/app/layout.tsx` so all pages use the same container and positioning.
  - Toast actions (e.g., "Orders-ga o'tish") navigate via `router.push('/orders')`.

- Mobile-friendly home hero
  - To avoid expensive GPU work on phones, the Home client (`src/app/home/HomeClient.tsx`) serves a lightweight static image `public/lightversion.jpg` for small screens and only mounts the animated `Galaxy` background on larger devices.

- Build/type fixes
  - During the production build a few TypeScript issues were fixed:
    - `src/app/api/orders/route.ts`: `restMap` entries now include optional `logoUrl`.
    - `src/app/api/reservations/route.ts`: transaction callback annotated `tx: any` (pragmatic fix; replace with proper Prisma types if you want stricter safety).
    - `src/app/profile/ThemeManager.tsx`: cast to `PageThemeConfig[]` when updating state from parsed JSON.

Verification & recommended steps
- Run the full build and type checks locally after UI changes:

```powershell
npm run build
```

- Dev run to validate interactions (recommended):

```powershell
npm run dev
```

- Visual checks to perform after UI edits:
  - `/menu`: open item modal, add to cart, confirm toast shows and Orders action navigates.
  - `/reservation`: pick a restaurant, open modal, submit reservation, confirm toast appears and navigation works.
  - `/` (home) on a mobile viewport: ensure `public/lightversion.jpg` is used and the page does not freeze.
  - Combobox dropdown colors in both light and dark themes across `/menu`, `/reservation` — ensure background and item selection look correct.

Follow-ups you may want me to do
- Move the single `Toaster` to `src/app/layout.tsx` (recommended).
- Replace `tx: any` with the correct Prisma `Prisma.TransactionClient` type for stricter typing.
- Add runtime validation when loading `page-themes` from `localStorage` to avoid casts and improve safety.
