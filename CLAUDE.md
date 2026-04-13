# LUSU Lens — Claude Instructions

## Project Overview

LUSU Lens is a client-side BI dashboard for Lakehead University Student Union (LUSU), managing two venues:
- **The Study Coffeehouse** — coffee shop, food, retail
- **The Outpost Campus Pub** — bar, food, events with door cover charges

The app runs entirely in the browser. POS data is uploaded as Excel files, parsed locally, and stored in IndexedDB. Nothing touches a server.

Deployed to GitHub Pages at `seawaydigital/lusu-lens` via GitHub Actions on every push to `main`.
Live URL: `https://seawaydigital.github.io/lusu-lens`

---

## Commands

```bash
npm run dev       # Local dev server
npm run build     # Production build (also validates types + lint)
npm run test      # Jest tests
npm run test:watch
```

Always run `npm run build` before pushing. The build will catch TypeScript errors that `dev` mode misses.

---

## Tech Stack

- **Next.js 14** with App Router, `output: 'export'` (static — no server-side code)
- **TypeScript** (strict)
- **Tailwind CSS** with custom venue color tokens
- **Recharts** for all charts
- **idb** (IndexedDB wrapper) for client-side persistence
- **xlsx** for Excel parsing
- **lucide-react** for icons
- **html2canvas + jsPDF** for PDF export

---

## Project Structure

```
src/
  app/
    page.tsx                    # Upload page (file drop zone)
    dashboard/page.tsx          # Overview dashboard (both venues)
    dashboard/study/page.tsx    # Study-specific dashboard
    dashboard/outpost/page.tsx  # Outpost-specific dashboard
    compare/page.tsx            # Month-over-month comparison
    manage/page.tsx             # Delete uploads

  components/
    shared/                     # Used by both venues
      AutoInsights.tsx          # Auto-surfaced key findings (4 cards)
      KpiCard.tsx               # Metric card with optional hint tooltip + subValue
      DailyTrendChart.tsx       # Line chart with avg reference line + event dots
      DaypartChart.tsx          # Stacked bar by DOW: BREAKFAST/LUNCH/DINNER
      SectionMixChart.tsx       # Horizontal bar: revenue by menu section
      WeeklyView.tsx            # Calendar heatmap (rows=DOW, cols=week)
      DataQualityBanner.tsx     # Single-upload flag banners
      DataQualityBannerGroup.tsx # Multi-upload summarized banners
      CategoryDonut.tsx
      TopItemsChart.tsx
      DowChart.tsx
      PaymentMethodChart.tsx
      MonthSelector.tsx
      ExportButton.tsx
      MissingDataSection.tsx

    outpost/
      EventDayAnalysis.tsx
      DoorRevenueTracker.tsx    # Cover charge revenue + attendance
      AlcoholFoodSplit.tsx
      DraftVsPackaged.tsx
      HappyHourImpact.tsx
      FridayWingsTracker.tsx
      CateringRevenue.tsx

    study/
      HotColdSplit.tsx
      FoodAttachRate.tsx
      SizeDistribution.tsx
      SeasonalItemTracker.tsx

  lib/
    db.ts                       # IndexedDB CRUD (idb, DB_VERSION=1)
    parsers/
      fileDetector.ts           # Identifies venue + file type from XLSX content
      summaryParser.ts          # Parses daily summary XLSX → DailySummary[]
      productParser.ts          # Parses product XLSX → ProductRecord[]
    metrics/
      sharedMetrics.ts          # calcGrossRevenue, calcNetRevenue, etc.
      studyMetrics.ts           # calcFoodAttachRate, etc.
      outpostMetrics.ts         # Outpost-specific calculations
      eventDetector.ts          # detectEventDays() — two-pass median algorithm
    export/
      csvExport.ts
      excelExport.ts
      pdfExport.ts

  types/index.ts                # All shared TypeScript interfaces
```

---

## Data Model

### `DailySummary`
One record per operating day per venue. Key fields:
- `grossSales`, `netSales`, `discounts`, `autoPricingDiscounts`, `tips`, `totalTransactions`
- `dayparts?: DaypartRecord[]` — BREAKFAST / LUNCH / DINNER/LATE NIGHT (requires re-upload if missing)
- `sections?: SectionRecord[]` — menu section revenue (requires re-upload if missing)
- `guestCount?: number` — from CLOSED TICKETS section (requires re-upload if missing)

### `ProductRecord`
One record per line item in the product export. Key fields:
- `item`, `category`, `size`, `quantity`, `gross`, `net`, `date`, `venue`

### `UploadRecord`
Metadata for each uploaded month. Key fields:
- `id`: `${venue}_${year}_${month}`
- `fileTypes`: which files were uploaded (`'summary'` and/or `'products'`)
- `dataQualityFlags`: array of `DataQualityFlag`
- `operatingDayCount`

### IndexedDB
- DB name: `lusu_lens_db`, version: `1`
- Stores: `uploads`, `products`, `summaries`
- Adding optional fields to stored types does NOT require a version bump

---

## URL Routing

Multi-month selection uses a `months` query param:
- `?months=2025-1` — single month
- `?months=2025-1,2025-2,2025-3` — multiple months
- Keys are `YEAR-MONTH` (not zero-padded month)

Dashboard pages filter uploads by these keys, load summaries and products for all selected months in parallel via `Promise.all`, then `flatMap` to combine results.

---

## Tailwind Color Tokens

```
lusu-navy:    #1B3A6B   (global nav)
lusu-cyan:    #00B4E6   (global accent)
study-gold:   #C4A952   (Study accent)
study-black:  #1A1A1A   (Study headings/borders)
outpost-black: #0D0D0D  (Outpost accent)
outpost-red:  #E63946   (event day dots)
```

---

## Known TypeScript Gotcha

**Do not use spread syntax on Sets.** TypeScript with the project's `tsconfig.json` throws:
> "Type 'Set<string>' can only be iterated through when using '--downlevelIteration' flag"

Always use `Array.from()`:
```ts
// Bad
new Set([...prev, item])
// Good
new Set(Array.from(prev).concat(item))
```

---

## Data Quality Flags

Flags are generated at upload time and stored on `UploadRecord.dataQualityFlags`:

| Type | Severity | Trigger |
|---|---|---|
| `incomplete_month` | warning | Fewer operating days than expected for the month |
| `net_gross_divergence` | info | >0 rows where net ≠ gross (item-level discounts) |
| `gift_card_present` | info | Any product with `category === 'Gift Cards'` |
| `event_day_detected` | info | `detectEventDays()` returns ≥1 result |

When viewing a single month → `DataQualityBanner`. Multiple months → `DataQualityBannerGroup` (summarizes by flag type across all uploads).

---

## Key Business Logic

### Event Detection (`eventDetector.ts`)
Two-pass median algorithm: flags days with gross revenue >2× the median. Re-runs after removing flagged days to get a cleaner baseline. Caps at top-3 if >40% of days are flagged.

### Outpost Door Revenue
Cover charge items matched with `/^\$\d+\s+COVER$/i` in product data (`category === 'DOOR REVENUE'`). Used by `DoorRevenueTracker` to compute attendance and revenue per head.

### Summary File Parser
The XLSX summary file has named sections (checked by row[0] value):
- `DAYPARTS` — BREAKFAST, LUNCH, DINNER/LATE NIGHT
- `SECTIONS` — COFFEE, TEA & HOT BEVERAGES, BEER BOTTLES/CANS, etc.
- `CLOSED TICKETS` — contains a `Guests` row with guest count

Components that depend on `dayparts`/`sections`/`guestCount` show a "re-upload required" prompt if those fields are absent on older data.

---

## Deployment

GitHub Actions workflow triggers on push to `main`. Runs `npm run build` and deploys `./out` to GitHub Pages. The `basePath` is `/lusu-lens`.

Static images (logos) live in `public/lusu-lens/logos/`.

---

## What NOT to do

- Do not add server components, API routes, or anything that requires a Node.js runtime — this is a fully static export.
- Do not bump `DB_VERSION` unless adding a new object store or index. Adding fields to existing records does not need a version bump.
- Do not add `'use client'` to files that are already server components, and vice versa — all dashboard pages are `'use client'` due to `useSearchParams`.
- Do not use Set spread syntax (see TypeScript gotcha above).
- Do not commit without running `npm run build` — the build is the type-check.
