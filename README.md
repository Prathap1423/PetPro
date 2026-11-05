# My Gold Vault

A private, mobile-first web app for tracking your personal gold jewellery: photos, weights (grams ⇄ sovereigns), purchase details, and an estimated current value.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage), deployed as a static site on Zoho Catalyst Slate · Recharts (Phase 2) · Lucide.

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Sign-in, cloud storage (Supabase), Add/Edit Gold with photos, collection gallery, details, dashboard summary cards, manual gold rates | **Built** |
| 2 | Charts, transaction history, mark sold/gifted/exchanged, reports (PDF/Excel/CSV) | Not started |
| 3 | Tamil/English UI, CSV import, backups, live-rate API, anniversaries | Not started |

## Hosting (Zoho Catalyst Slate)

The Slate app uses the **Static** framework, which serves files as they are and does not run a build. So the built site is committed in `site/` and served at https://petpro.onslate.in/site/. Slate's **Root Path** stays `./` (its settings dialog won't save a change), so the root `index.html` redirects visitors to `/site/`, and `npm run build:site` builds the app with the `/site` base path.

After changing the app, rebuild and commit `site/`, then push:

```bash
npm run build:site
git add site && git commit -m "Rebuild site"
git push origin master
```

Slate redeploys from `master` (or click **Sync Now** in Slate).

## Where the data lives

Everything (items, rates, photos, bills) is saved in **Supabase**, so it is the same on every device you sign in on. Each account only ever sees its own data: every table and both file buckets have row level security tied to the signed-in user.

- **Tables:** `jewellery`, `jewellery_images`, `gold_rates`, `transactions` (all with `user_id`).
- **Files:** private buckets `jewellery-images` and `jewellery-bills`, under `<user id>/<jewellery id>/…`, opened with short-lived signed URLs.
- **Project settings:** `src/config.ts` holds the project URL and the *publishable* key. Both are public by design; never put the secret / `service_role` key in the code.

### One-time Supabase setup

1. **SQL Editor → New query:** paste all of `supabase/schema.sql` and run it once.
2. **Authentication → URL Configuration:** set **Site URL** to `https://petpro.onslate.in/site/` and add these **Redirect URLs**: `https://petpro.onslate.in/site/**` and `http://localhost:3000/**`.
3. Open the site, **Create an account**, and confirm the email.
4. Optional, for a personal vault: **Authentication → Sign In / Providers → turn off "Allow new users to sign up"** once your account exists.

## Developing

`npm install && npm run dev`, then open http://localhost:3000.
`npm run build` writes the static site to `out/`; `npm run build:site` builds with the `/site` base path and copies the result to `site/` for Slate. Set `NEXT_PUBLIC_BASE_PATH` only if the site is served from a sub-path (for example `/app`).

Scripts: `npm run dev | build | typecheck | test`.

## Architecture

```
src/
  app/                  Next.js routes only. Each page.tsx renders one feature screen.
  features/
    dashboard/          screens/ + components/ for the summary page
    jewellery/          screens/ (collection, detail, add, edit), components/, queries.ts, service.ts
    rates/              screens/, components/, queries.ts, service.ts
    auth/               sign in/up, password reset, AuthGate that guards the app
  domain/               Pure business logic and types: gold.ts (weights, valuation), jewellery.ts (rules), schemas.ts (zod), types.ts
  storage/              Supabase: supabase.ts (client, current user), files.ts (photos/bills), changes.ts (reload events)
  hooks/                use-vault-data.ts: load data and reload when the vault changes
  components/           Shared UI: ui/ primitives, layout/app-nav, providers, theme toggle, page skeleton
  lib/                  Small helpers: utils.ts (cn, dates), image.ts (compression, file checks)
tests/                  Vitest unit tests for domain/
```

Dependencies point one way: **app → features → domain / storage**.

- **Screens** load data with `useVaultData(query)` and compose components. **Components** only render and call services.
- **`queries.ts`** reads from storage and **`service.ts`** writes to it: it validates with the domain schemas, enforces the rules, stores files, and rolls back on failure. UI code never imports `storage/` directly.
- **`domain/`** imports nothing from React or storage, so it is fully unit-testable.
- A feature may use another feature's queries or components (the dashboard uses jewellery and rates), but never its storage.

## How it works

- **Business logic** lives in `src/domain/` (pure functions, unit-tested in `tests/`): 1 sovereign = 8 g, net weight, cost estimate, purity-based valuation, inventory totals (only *owned* items count).
- **Purchase price is never overwritten.** The form shows a cost estimate and a "Use estimate" button; the number saved is always what you typed.
- **Net weight is derived on save** (`net = gross − non-gold`) and every save is validated with Zod.
- **Valuation:** uses the rate you saved for that purity; if none, derives it from the 24K rate (22K = 22/24). "Other" purity needs its own rate. Items with no usable rate are excluded from the estimate and flagged.
- **Files:** photos are resized to JPEG in the browser before upload; item pages use `?id=` URLs because a static site can't pre-build a page per item.
- **Duplicates:** the same invoice number, or the same name + date + gross weight, is rejected.

## Known limitations (Phase 1)

- Making/wastage/tax entered as a percentage are converted to a ₹ amount on save; editing shows the saved amount, not the original percentage.
- UI primitives are hand-written in the shadcn/ui style (`src/components/ui`) rather than generated with the shadcn CLI.
- Items saved earlier in the browser-only version (IndexedDB) are not moved to Supabase automatically.
