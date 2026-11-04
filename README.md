# My Gold Vault

A private, mobile-first web app for tracking your personal gold jewellery: photos, weights (grams ⇄ sovereigns), purchase details, and an estimated current value.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · local JSON storage · Recharts (Phase 2) · Lucide.

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Local storage, Add/Edit Gold with photos, collection gallery, details, dashboard summary cards, manual gold rates | **Built** |
| 2 | Charts, transaction history, mark sold/gifted/exchanged, reports (PDF/Excel/CSV) | Not started |
| 3 | Tamil/English UI, CSV import, backups, live-rate API, anniversaries | Not started |

## Setup

`npm install && npm run dev`, open http://localhost:3000 and tap **Add Gold**. There is no login: the app opens straight to the dashboard.

Data is saved on disk in `data/` (git-ignored): records in `data/vault.json`, photos and bills in `data/uploads/`. Back up that folder to keep your vault; delete it to start fresh.

Scripts: `npm run dev | build | start | typecheck | test`.

## How it works

- **Business logic** lives in `src/lib/gold.ts` (pure functions, unit-tested in `tests/gold.test.ts`): 1 sovereign = 8 g, net weight, cost estimate, purity-based valuation, inventory totals (only *owned* items count).
- **Purchase price is never overwritten.** The form shows a cost estimate and a "Use estimate" button; the number saved is always what you typed.
- **Net weight is derived server-side** (`net = gross − non-gold`); the browser's value is never trusted.
- **Valuation:** uses the rate you saved for that purity; if none, derives it from the 24K rate (22K = 22/24). "Other" purity needs its own rate. Items with no usable rate are excluded from the estimate and flagged.
- **Files:** photos and bills are written under `data/uploads/` and served by `/api/files/…`; uploads are restricted by type, size and a strict path pattern, and all writes are validated again on the server with Zod.
- **Duplicates:** the same invoice number, or the same name + date + gross weight, is rejected.

## Known limitations (Phase 1)

- Making/wastage/tax entered as a percentage are converted to a ₹ amount on save; editing shows the saved amount, not the original percentage.
- UI primitives are hand-written in the shadcn/ui style (`src/components/ui`) rather than generated with the shadcn CLI.
- No login: anyone who can reach the server can see and edit the vault, so only run it on your own machine or network.
