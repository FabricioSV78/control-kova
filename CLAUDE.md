# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

KOVA Control — a responsive React/TypeScript app for managing made-to-order bracelet sales (with wrist
measurement), expenses, partner contributions, products, delivery history, and reports for the KOVA business.
It also serves a public product catalog at `/catalogo`. UI copy and docs are in Spanish.

## Commands

```bash
npm install
npm run dev         # dev server (Vite, port 5173)
npm run typecheck   # tsc -b --pretty false (strict TypeScript, no emit)
npm run lint        # eslint .
npm test            # vitest run (single run, not watch)
npm run build       # tsc -b && vite build -> dist/
npm run preview     # preview dist/ (port 4173)
```

Run a single test file with `npx vitest run src/utils/analytics.test.ts` (or drop `run` for watch mode).

Before considering a change done, run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` —
this mirrors the pre-deploy checklist in [docs/deployment.md](./docs/deployment.md).

Deploy commands (Cloudflare Pages): `npm run pages:dev` (wrangler local preview) and `npm run deploy:pages`
(build + `wrangler pages deploy`). Production config (build command/output dir/env vars) is managed in the
Cloudflare dashboard, not in repo files — see [docs/deployment.md](./docs/deployment.md).

## Architecture

Full details live in [docs/architecture.md](./docs/architecture.md) (data model/relations),
[docs/security.md](./docs/security.md) (RLS policies), and [docs/deployment.md](./docs/deployment.md).
Read those before making data-model or security-relevant changes. The condensed version:

### Service contract / demo mode

Everything data-related flows through a single interface, `KovaService`
([src/services/contracts.ts](./src/services/contracts.ts)). Components never import Supabase directly —
they call hooks (`useWorkspace`, `useAuth`), which read from context, which is backed by one of two
interchangeable implementations:

- `SupabaseKovaService` ([src/services/supabaseService.ts](./src/services/supabaseService.ts)) — the real
  backend, used when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are both set (`hasSupabaseConfig` in
  [src/lib/env.ts](./src/lib/env.ts)).
- `DemoKovaService` ([src/services/demoService.ts](./src/services/demoService.ts)) — a `localStorage`-backed
  implementation of the exact same contract, selected automatically when Supabase env vars are missing. Seed
  data lives in [src/services/demoData.ts](./src/services/demoData.ts) and reproduces fixed totals (S/ 58.00
  income, S/ 126.50 expenses) — don't change these without checking the README's documented values.

The implementation is chosen once in [src/contexts/WorkspaceProvider.tsx](./src/contexts/WorkspaceProvider.tsx)
(`hasSupabaseConfig ? new SupabaseKovaService() : new DemoKovaService()`). When adding a new mutation or
query, add it to `KovaService` first, then implement it in **both** services — the demo mode must stay a
faithful mirror of the real backend's behavior (including validation rules like the 5–50cm wrist measurement
range).

### Data model & backend (Supabase/PostgreSQL)

- RLS is enabled on every table, scoped by `business_members` via the `is_business_member` helper (fixed
  `search_path`, never trusts a client-supplied `business_id`).
- Accounting mutations (sales, expenses) go through `security definer` RPC functions (`create_sale`,
  `update_sale`, `void_sale`, `create_expense`, `update_expense`) that re-check membership and perform all
  writes in one transaction. There are no direct insert/update RLS policies on `sales`, `sale_items`,
  `expenses`, `expense_contributions`, or `activity_log` — only the RPCs can write to them.
  `SupabaseKovaService` calls these RPCs rather than the PostgREST table API for anything transactional.
- Sales/expenses are voided, never deleted, preserving an audit trail (`void_sale` / `voidExpense`).
- There is no finished-goods inventory: `products` is a catalog of models/prices/estimated costs, and every
  `sale_items` row carries `wrist_measurement_cm` because each bracelet is made to order.
- The public catalog route never queries admin tables directly; it calls the `get_public_catalog` RPC, which
  returns a restricted projection (no cost data) of active products and published deliveries.
- Migrations live in [supabase/migrations](./supabase/migrations) and must be applied **in order**; see
  [supabase/README.md](./supabase/README.md) for setup steps (disable public signup, manually create the two
  users, seed the workspace).

### Product images vs. delivery images (two different pipelines)

- **Catalog product photos** are static files checked into [public/productos/catalogo/](./public/productos/catalogo)
  (folder name = product name; `Outfit-<Producto>` prefix = outfit gallery), converted at build time. `predev`
  and `prebuild` run `npm run catalog:images`
  ([scripts/generate-product-images-manifest.mjs](./scripts/generate-product-images-manifest.mjs)), which uses
  `sharp` to convert everything to versioned WebP under `public/productos/optimized/` and writes
  `public/productos/manifest.json`. `postbuild`
  ([scripts/clean-production-images.mjs](./scripts/clean-production-images.mjs)) strips the original PNG/JPG
  sources from `dist` so only optimized WebP ships. Changing a product photo requires a commit + redeploy.
- **Delivery showcase photos** (`entregas`) are uploaded from within the running app, resized/converted to
  WebP client-side ([src/utils/imageUpload.ts](./src/utils/imageUpload.ts)), and stored in the Supabase
  `delivery-images` bucket — no redeploy needed.

### Routing & app shell

[src/app/App.tsx](./src/app/App.tsx) defines routes, all lazy-loaded. `/login` and `/catalogo` are public;
everything else is nested under `ProtectedRoute` (requires auth) → `WorkspaceGate` (requires a loaded
workspace) → `AppShell` (sidebar layout). `AppProviders` wraps the app in `AuthProvider` → `WorkspaceProvider`
→ a `sonner` `Toaster`.

### Directory layout

```text
src/
  app/          providers and routes
  components/
    layout/     AppShell, Sidebar, ProtectedRoute, WorkspaceGate
    features/   feature-specific components (dashboard, sales, expenses, products, inventory, import)
    ui/         shared primitives
  contexts/     AuthContext/AuthProvider, WorkspaceContext/WorkspaceProvider
  hooks/        typed access to the above contexts
  lib/          env.ts (env var parsing/hasSupabaseConfig), supabase.ts (client)
  pages/        one entry per sidebar/menu section
  services/     KovaService contract + Supabase/demo implementations, CSV import/export, product image lookup
  types/        domain.ts (app-level types), database.ts (generated Supabase schema types)
  utils/        currency/date formatting, filters, CSV/image helpers
supabase/
  migrations/   schema, RLS policies, and transactional functions, applied in filename order
docs/           architecture.md, security.md, deployment.md
```

### Build tooling notes

- TypeScript project references (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`); `npm run
  typecheck` uses `tsc -b`.
- Vite build uses Rolldown (`vite@8`, rolldown-based) with manual code-splitting groups for `recharts`/`d3-`,
  `@supabase`, and `react`/`react-router` in [vite.config.ts](./vite.config.ts).
- Tailwind CSS v4 via the `@tailwindcss/vite` plugin (no separate Tailwind config file).
- Node version is pinned via `.nvmrc` (22) and matched in Cloudflare Pages.

## Environment variables

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-publica
VITE_ENABLE_DEMO_MODE=false
```

Never add `SUPABASE_SERVICE_ROLE_KEY` to this project — only the anon/public key is used, protected by RLS.
Local overrides go in `.env.local` (gitignored); production values are set in the Cloudflare Pages dashboard.
