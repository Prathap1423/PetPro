# My Gold Vault

A private, mobile-first web app for tracking your personal gold jewellery: photos, weights (grams ⇄ sovereigns), purchase details, and an estimated current value.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · browser storage (IndexedDB), deployed as a static site on GitHub Pages · Recharts (Phase 2) · Lucide.

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Browser storage, Add/Edit Gold with photos, collection gallery, details, dashboard summary cards, manual gold rates | **Built** |
| 2 | Charts, transaction history, mark sold/gifted/exchanged, reports (PDF/Excel/CSV) | Not started |
| 3 | Tamil/English UI, CSV import, backups, live-rate API, anniversaries | Not started |

## Using it

Open **https://prathap1423.github.io/PetPro/**. Nothing to install or start, and no login.

Every push to `master` rebuilds and publishes the site (`.github/workflows/pages.yml`). One-time setup: in the GitHub repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.

## Where the data lives

Everything (items, rates, photos, bills) is saved **in the browser you use**, in IndexedDB. Nothing is uploaded anywhere. That means:

- Each browser and device has its own separate vault: your phone and laptop do not share data.
- Clearing the site's data or browsing history for github.io deletes the vault.
- Private/incognito windows start empty and forget everything when closed.

## Developing

`npm install && npm run dev`, then open http://localhost:3000.
`npm run build` writes the static site to `out/` (set `NEXT_PUBLIC_BASE_PATH=/PetPro` to match GitHub Pages).

Scripts: `npm run dev | build | typecheck | test`.

## How it works

- **Business logic** lives in `src/lib/gold.ts` (pure functions, unit-tested in `tests/gold.test.ts`): 1 sovereign = 8 g, net weight, cost estimate, purity-based valuation, inventory totals (only *owned* items count).
- **Purchase price is never overwritten.** The form shows a cost estimate and a "Use estimate" button; the number saved is always what you typed.
- **Net weight is derived on save** (`net = gross − non-gold`) and every save is validated with Zod.
- **Valuation:** uses the rate you saved for that purity; if none, derives it from the 24K rate (22K = 22/24). "Other" purity needs its own rate. Items with no usable rate are excluded from the estimate and flagged.
- **Files:** photos are resized to JPEG in the browser and stored as blobs next to the records; item pages use `?id=` URLs because a static site can't pre-build a page per item.
- **Duplicates:** the same invoice number, or the same name + date + gross weight, is rejected.

## Known limitations (Phase 1)

- Making/wastage/tax entered as a percentage are converted to a ₹ amount on save; editing shows the saved amount, not the original percentage.
- UI primitives are hand-written in the shadcn/ui style (`src/components/ui`) rather than generated with the shadcn CLI.
- No backup or sync yet: export/import is not built, so the vault exists only in one browser.
