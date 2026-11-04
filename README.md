# My Gold Vault

A private, mobile-first web app for tracking your personal gold jewellery: photos, weights (grams ⇄ sovereigns), purchase details, and an estimated current value.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, private Storage) · Recharts (Phase 2) · Lucide.

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Database + RLS, auth, Add/Edit Gold with photos, collection gallery, details, dashboard summary cards, manual gold rates | **Built** |
| 2 | Charts, transaction history, mark sold/gifted/exchanged, reports (PDF/Excel/CSV) | Not started |
| 3 | Tamil/English UI, CSV import, backups, live-rate API, anniversaries | Not started |

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/0001_init.sql` (SQL editor, or `supabase db push`). It creates the tables, constraints, indexes, RLS policies and the two **private** storage buckets.
3. In Supabase → Authentication → URL Configuration, add your site URL and `<site>/auth/callback` to the redirect list (needed for email confirmation and password reset).
4. `cp .env.example .env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Optionally set `NEXT_PUBLIC_SITE_URL` in production.
5. `npm install && npm run dev`, open http://localhost:3000, register, and tap **Add Gold**.

Scripts: `npm run dev | build | start | typecheck | test`.

## How it works

- **Business logic** lives in `src/lib/gold.ts` (pure functions, unit-tested in `tests/gold.test.ts`): 1 sovereign = 8 g, net weight, cost estimate, purity-based valuation, inventory totals (only *owned* items count).
- **Purchase price is never overwritten.** The form shows a cost estimate and a "Use estimate" button; the number saved is always what you typed.
- **Net weight is derived server-side** and enforced by a DB check constraint (`net = gross − non-gold`).
- **Valuation:** uses the rate you saved for that purity; if none, derives it from the 24K rate (22K = 22/24). "Other" purity needs its own rate. Items with no usable rate are excluded from the estimate and flagged.
- **Privacy:** every table has RLS (`user_id = auth.uid()`), buckets are private with per-user folder policies, images/bills are served only through 1-hour signed URLs, uploads are restricted by type and size, and all writes are validated again on the server with Zod.
- **Duplicates:** unique indexes on (user, invoice number) and (user, name, date, gross weight).

## Known limitations (Phase 1)

- Making/wastage/tax entered as a percentage are converted to a ₹ amount on save; editing shows the saved amount, not the original percentage.
- UI primitives are hand-written in the shadcn/ui style (`src/components/ui`) rather than generated with the shadcn CLI.
- No DB types are generated yet (`supabase gen types`), so query results are cast manually.
- Image MIME checks rely on the browser-declared type plus the bucket allow-list; add server-side content sniffing if you need stricter guarantees.
