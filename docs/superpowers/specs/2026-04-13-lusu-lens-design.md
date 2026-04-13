# LUSU Lens — Design Document

**Date:** 2026-04-13
**Status:** Approved
**Build strategy:** Option A — spec-faithful, phase-by-phase

---

## Context

LUSU operates two campus venues — The Study Coffeehouse and The Outpost Campus Pub — that export monthly POS data as Excel workbooks. This data currently sits unused in spreadsheets. LUSU Lens is a browser-based BI dashboard that ingests those files, stores them locally in IndexedDB, and surfaces actionable metrics for venue managers and executives. No backend, no login, no server costs — deployed as a static site on GitHub Pages forever.

---

## Branding & Color System

### Global (LUSU brand)
| Token | Hex | Usage |
|---|---|---|
| `navy` | `#1B3A6B` | Nav background, headings, global chrome |
| `cyan` | `#00B4E6` | Primary CTA buttons, active nav, LUSU Lens logo accent |
| `white` | `#FFFFFF` | Page surfaces, card backgrounds |
| `gray-50` | `#F8FAFC` | Alternate fills, subtle card backgrounds |

### The Study Coffeehouse
| Token | Hex | Usage |
|---|---|---|
| `study-gold` | `#C4A952` | KPI card borders, chart fills, active section nav, accent badges |
| `study-black` | `#1A1A1A` | Body text within Study pages |

### The Outpost Campus Pub
| Token | Hex | Usage |
|---|---|---|
| `outpost-black` | `#0D0D0D` | KPI card borders, chart fills, dark panel backgrounds |
| `outpost-white` | `#FFFFFF` | Text on dark surfaces |
| `outpost-red` | `#E63946` | Event day markers only |

Venue identity is immediately recognisable on switching: Study = warm gold on white; Outpost = stark black/white with red event callouts.

### Logo assets
Store in `/public/logos/`:
- `lusu.png` — LUSU master logo (navy + cyan)
- `study.png` — The Study Coffeehouse logo (gold + black)
- `outpost.png` — The Outpost Campus Pub logo (black + white)

---

## Tech Stack

| Concern | Tool | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | `output: 'export'` for static build |
| Language | TypeScript 5.x | Required throughout |
| Styling | Tailwind CSS 3.x | Custom tokens for venue colors |
| Excel parsing | SheetJS (`xlsx`) | Browser-only, read + write |
| Charts | Recharts 2.x | React-native, responsive |
| Browser storage | `idb` | Typed IndexedDB wrapper |
| PDF export | jsPDF + html2canvas | DOM capture, A4 output |
| ZIP (CSV export) | `fflate` | Browser-native, no WASM, lightweight |
| Icons | lucide-react | |
| Date handling | date-fns | DOW analysis, week grouping |

Deployed to GitHub Pages via GitHub Actions. Every push to `main` builds and deploys automatically.

---

## Data Sources

Four Excel files per month, auto-detected by filename:

| Pattern | Venue | Type |
|---|---|---|
| `Study_Product_Sales_-_*.xlsx` | Study | Item-level daily sales |
| `OP_Product_Sales_-_*.xlsx` | Outpost | Item-level daily sales |
| `Study_-_*.xlsx` | Study | Daily financial summary |
| `Outpost_-_*.xlsx` | Outpost | Daily financial summary |

Each workbook has one sheet per operating day (`M-D-YYYY` format). Month/year parsed from filename.

**Parser validation benchmarks (September 2024):**
- Study gross: $28,599 — Study net: $28,182
- Outpost gross: $77,509 — Outpost net: $74,381

Any deviation from these figures during development = a parser bug.

---

## Data Model

### TypeScript interfaces

```typescript
interface ProductRecord {
  date: string           // ISO: '2024-09-03'
  venue: 'study' | 'outpost'
  item: string
  size: string | null
  category: string
  quantity: number
  net: number
  gross: number          // canonical revenue figure
}

interface TransactionRecord {
  type: string           // 'Cash', 'Credit - Visa', etc.
  count: number
  amount: number
  tip: number
  total: number
}

interface DailySummary {
  date: string
  venue: 'study' | 'outpost'
  grossSales: number
  autoPricingDiscounts: number   // Outpost happy hour; always ≤ 0
  discounts: number              // Manual discounts; always ≤ 0
  netSales: number
  taxes: number
  tips: number
  grossReceipts: number
  totalTransactions: number
  transactions: TransactionRecord[]
}

interface UploadRecord {
  id: string             // `${venue}_${year}_${month}`
  venue: 'study' | 'outpost'
  year: number
  month: number
  uploadedAt: string
  fileTypes: Array<'products' | 'summary'>
  operatingDayCount: number
  dataQualityFlags: DataQualityFlag[]
}

interface DataQualityFlag {
  type: 'incomplete_month' | 'net_gross_divergence' | 'gift_card_present' | 'event_day_detected'
  message: string
  severity: 'info' | 'warning'
}
```

### IndexedDB schema
Database: `lusu_lens_db` v1

| Store | Key | Indexes | Notes |
|---|---|---|---|
| `uploads` | `id` (path) | — | Stores full `UploadRecord` as JSON |
| `products` | auto-increment | `venue_date` compound on `[venue, date]` | One record per `ProductRecord` row |
| `summaries` | auto-increment | `venue_date` compound on `[venue, date]` | One record per `DailySummary`. The `transactions: TransactionRecord[]` array is stored as a JSON-serialised blob within the same summaries record — there is no separate IndexedDB store for transactions. idb handles this automatically via structured clone. |

All DB access via `lib/db.ts` — never directly from components.

**Overwrite behaviour:** If a user uploads files for a month+venue combination that already exists in `uploads`, the flow is:
1. Warn the user and require explicit confirmation to overwrite
2. On confirmation: delete all existing `products` and `summaries` records matching that `venue + year + month` (using the `venue_date` index), then delete the `uploads` manifest entry, then write the fresh records and new manifest entry
3. On cancel: abort — existing data is untouched

**Partial upload behaviour (one file type only):**
- If only `products` is present: M1–M7 KPI cards sourced from `DailySummary` show a placeholder ("Summary file not uploaded"). Product charts (M9, M10, M13–M16, M18–M22) render normally.
- If only `summary` is present: KPI cards render normally. Product charts show a placeholder ("Product sales file not uploaded").
- Partial state is recorded in `UploadRecord.fileTypes` and surfaced on the manage page.

---

## Application Architecture

```
/src
  /app
    /page.tsx                      Upload landing
    /dashboard/page.tsx            Overview — both venues
    /dashboard/study/page.tsx      Study deep-dive
    /dashboard/outpost/page.tsx    Outpost deep-dive
    /compare/page.tsx              Month-over-month comparison
    /manage/page.tsx               Upload history and deletion
    /layout.tsx                    Root layout with nav

  /components
    /shared
      KpiCard.tsx
      DailyTrendChart.tsx
      CategoryDonut.tsx
      TopItemsChart.tsx
      DowChart.tsx
      PaymentMethodChart.tsx
      ExportButton.tsx
      EventDayBadge.tsx
      DataQualityBanner.tsx
      MonthSelector.tsx

    /study
      HotColdSplit.tsx
      FoodAttachRate.tsx
      SeasonalItemTracker.tsx
      SizeDistribution.tsx

    /outpost
      EventDayAnalysis.tsx
      AlcoholFoodSplit.tsx
      DraftVsPackaged.tsx
      HappyHourImpact.tsx
      FridayWingsTracker.tsx
      CateringRevenue.tsx
      DoorRevenue.tsx

  /lib
    /db.ts
    /parsers
      productParser.ts
      summaryParser.ts
      fileDetector.ts
    /metrics
      studyMetrics.ts
      outpostMetrics.ts
      sharedMetrics.ts
      eventDetector.ts
    /export
      pdfExport.ts
      excelExport.ts
      csvExport.ts

  /types
    index.ts

/public
  /logos
    lusu.png
    study.png
    outpost.png
  .nojekyll
```

---

## Pages

### `/` — Upload landing
- LUSU Lens branded header (navy bar, cyan accent)
- Drag-and-drop zone accepting multiple `.xlsx` files simultaneously
- Per-file detection feedback: confirmed label or "Unrecognised file" error
- "Process files" button — disabled until at least one file detected
- Parse progress indicator (SheetJS can take 2–3s on large files)
- Below zone: previously uploaded months list with dashboard links
- Validation: warn (not block) on partial uploads; warn on overwrite; error + reject unrecognised files

### `/dashboard` — Overview
- Month selector at top
- Combined LUSU revenue hero metric (Study net + Outpost net) with venue share donut (M27)
- Two-column KPI row: Study left (gold accent), Outpost right (black accent)
- Side-by-side daily trend charts
- Revenue per operating day venue comparison — side-by-side bars, blended and event-adjusted (M28)
- Tip rate and transaction volume comparison (M29, M30)
- Sticky export button

### `/dashboard/study` — Study deep-dive
Sticky section nav: Revenue → Products → Patterns → Payment
- KPI cards: Gross Revenue, Net Revenue, Avg/Day, Transactions, ATV, Tip Rate, Discount Rate (M1–M7)
- Daily trend chart (M8)
- Category donut (M9)
- Top items bar chart (M10)
- DOW chart (M11)
- Payment method stacked bar (M12)
- Hot/cold split (M13)
- Food attach rate (M14)
- Size distribution (M16)
- Seasonal item tracker (M15) — placeholder until 2+ months

### `/dashboard/outpost` — Outpost deep-dive
Sections: **Event Analysis** → Revenue → Products → Alcohol & Beverage → Food → Payment

Event Analysis **must appear first**. No Outpost metric is correctly interpreted without establishing event context first.

- Event Day Analysis (M17): flagged dates, event revenue %, regular-night average
- KPI cards: same set as Study plus event-adjusted variants for M3, M7 (M1–M7)
- Daily trend with event markers + 7-day rolling average (M8)
- Category donut with catering hatching + gift card toggle (M9)
- Top items excluding catering by default (M10)
- DOW event-adjusted as default with raw toggle (M11)
- Alcohol vs food split (M18)
- Draft vs packaged (M19)
- Happy hour impact card (M20)
- Friday Wings tracker (M21)
- Catering & door revenue (M22)
- Payment method chart (M12)

### `/compare` — Month-over-month
Accessible only when 2+ months of data exist for at least one venue.

- Nav link is always visible but disabled (greyed out, cursor-not-allowed) when the condition is not met
- If a user navigates directly to `/compare` without sufficient data: render a full-page empty state with the message "Month-over-month comparison requires at least two months of uploaded data" and a CTA button linking back to the upload page
- When condition is met: line chart per venue (one line per month, plotted by day-of-month), KPI delta table with % change arrows, product comparison with new/removed item flags

### `/manage` — Upload history
List of all uploads with date, operating day count, data quality flags. Delete (with confirmation) and re-upload per entry.

---

## Metrics (30 total)

### Tier 1 — KPI Cards
| ID | Metric | Formula |
|---|---|---|
| M1 | Monthly Gross Revenue | `SUM(grossSales)` |
| M2 | Net Revenue | `SUM(netSales)` |
| M3 | Avg Revenue/Day | `SUM(netSales) / COUNT(days)` — Outpost shows blended + event-adjusted |
| M4 | Total Transactions | `SUM(totalTransactions)` |
| M5 | ATV | `SUM(netSales) / SUM(totalTransactions)` |
| M6 | Tip Rate | `SUM(tips) / SUM(netSales) * 100` |
| M7 | Discount Rate | Study: `ABS(SUM(discounts)) / SUM(grossSales) * 100`. Outpost: two figures — manual: `ABS(SUM(discounts)) / SUM(grossSales) * 100`; happy hour: `ABS(SUM(autoPricingDiscounts)) / SUM(grossSales) * 100`. Never combined. |

### Tier 2 — Primary Charts
| ID | Chart | Notes |
|---|---|---|
| M8 | Daily Revenue Trend | Line chart; Outpost adds event markers + 7-day rolling avg |
| M9 | Revenue by Category | Donut; Outpost excludes gift cards by default, hatches catering |
| M10 | Top Items by Revenue | Horizontal bar top 10; Outpost excludes catering by default |
| M11 | Day-of-Week Performance | Bar chart; Outpost event-adjusted default + raw toggle |
| M12 | Payment Method Breakdown | Stacked bar by day; Cash/Debit/Visa/MC; group Amex+House into Other |

### Tier 3 — Study-Specific
| ID | Panel |
|---|---|
| M13 | Hot vs Cold Beverage Split |
| M14 | Food Attach Rate (most actionable Study metric) |
| M15 | Seasonal Item Tracker (requires 2+ months) |
| M16 | Size Distribution |

### Tier 3 — Outpost-Specific
| ID | Panel |
|---|---|
| M17 | Event Day Analysis — appears FIRST |
| M18 | Alcohol vs Food Revenue Split |
| M19 | Draft vs Packaged Beer |
| M20 | Happy Hour Discount Impact |
| M21 | Friday Wings Performance |
| M22 | Catering & Door Revenue |

### Tier 4 — Inline Flags
| ID | Flag |
|---|---|
| M23 | Event day marker on all Outpost chart points |
| M24 | Gift card revenue flag wherever total is shown |
| M25 | Net vs Gross divergence info banner (dismissible) |
| M26 | Incomplete month warning banner |

### Cross-venue (Overview only)
| ID | Metric |
|---|---|
| M27 | Combined LUSU Revenue (hero) |
| M28 | Revenue/Day venue comparison |
| M29 | Tip rate comparison |
| M30 | Transaction volume comparison |

---

## Event Day Detection Algorithm

Runs at upload time on all Outpost data. Two-pass median method:

1. Calculate median daily gross revenue for the month
2. Flag any day where `grossSales > median × 2.0`
3. Recalculate median using only unflagged days
4. Re-flag any days where `grossSales > new_median × 2.0`
5. Stop — results stored in upload manifest

**Edge cases:**
- If zero days are flagged after both passes: treat entire month as regular operation with no event days. No event-adjusted figures shown; M17 panel displays "No event days detected this month."
- If more than 40% of operating days are flagged: cap event days at the top 3 by gross revenue. Surface a warning: "Unusual revenue distribution detected — event day count capped at 3. Review manually."

September 2024 results: Sept 10 ($12,036), Sept 26 ($12,600), Sept 27 ($18,890) — 56.2% of monthly revenue.

---

## Export System

### PDF
- Each dashboard section is captured independently via html2canvas (scale: 2) and assembled into a single jsPDF document, one section per page. This avoids the memory/blank-region issue that occurs when html2canvas tries to capture a long multi-section DOM in one call.
- Each page gets a consistent LUSU Lens header (venue name, month/year) and footer (export timestamp, "Data source: LUSU POS export")
- Filename: `LUSULens_[Venue]_[Month]_[Year].pdf`
- Print CSS: `@media print` hides nav, buttons, selectors

### Excel (SheetJS write)
5-sheet workbook: Summary, Daily Revenue, Product Totals, Transactions, Raw Products
- Filename: `LUSULens_[Venue]_[Month]_[Year]_Data.xlsx`

### CSV (ZIP)
Two files: `products.csv` + `summaries.csv` for Power BI / Tableau users. ZIP produced using `fflate` (lightweight, browser-native, no WASM). Add `fflate` to the tech stack. Trigger a single browser download of `LUSULens_[Venue]_[Month]_[Year]_Data.zip`.

---

## Risk Implementations (all required)

| Risk | Implementation |
|---|---|
| R1: Event days skew Outpost averages | Event detection at upload; all averages show blended + adjusted; all charts mark event days |
| R2: Gift card revenue inflation | Excluded by default from product analytics; toggle to include; inline flag on totals |
| R3: Auto-pricing ≠ manual discounts | M7 shows two separate figures for Outpost; never combined |
| R4: Study Friday is structural, not anomaly | No threshold alerting; DOW chart communicates the pattern; DOW comparison uses day-of-week baseline |
| R5: Catering is non-recurring | Excluded from M10 by default; own M22 panel; hatched fill in M9 donut |
| R6: Net/Gross divergence is expected | Gross used throughout; divergence count in manifest; dismissible info banner |
| R7: "Total" rows in Outpost sheets | Filter: `item.toLowerCase() === 'total'`; also filter `gross === 0 AND quantity === 0` |

---

## Known Data Quirks

Preserve in `KNOWN_ISSUES.md` in the repository root.

| Quirk | Handling |
|---|---|
| "Total" row in some Outpost product sheets (e.g. 9-23-2024) | Filter by item name |
| Auto Pricing Discounts up to -$1,250/day | Separate field, never combined with Discounts |
| Gift card sales as product records | Default exclude by category |
| LU Soccer Buffet: 398-unit $9,950 catering line | Default exclude; own panel |
| Net vs Gross differs 100+ rows/venue | Use Gross; log count; info banner |
| Outpost data starts 9-10-2024 (not 9-3) | Incomplete month warning |
| FRIDAY WINGS item name exact match | M21 panel matches using `item.trim().toUpperCase() === 'FRIDAY WINGS'` — normalise before comparison to handle casing/spacing variants |
| Women's Day Promo / Spring Drinks category | Include in M15 seasonal tracker |
| House Account payment type | Group into "Other" unless `TransactionRecord.count` for "House Account" exceeds 5% of `SUM(totalTransactions)` for that month (i.e. individual transaction count, not number of rows in the transactions array) — if so, display as its own labelled segment "House Account" in the payment chart |
| Some rows: Net=0, Gross>0 | Keep; use Gross; do not filter |
| Outpost 9-18-2024: Non-Revenue Items = -500 | Parse separately; do not net against gross |

---

## Build Order (8 Phases)

### Phase 1 — Parser and storage (no UI)
`fileDetector.ts` → `productParser.ts` → `summaryParser.ts` → `db.ts`
Acceptance: Study gross $28,599, Outpost gross $77,509 from September files.

### Phase 2 — Upload flow
Drag-and-drop landing, detection feedback, progress indicator, IndexedDB write, manifest list.

### Phase 3 — Shared components + metrics layer
All primitives (KpiCard, DataQualityBanner, EventDayBadge, MonthSelector, ExportButton), metric calculation functions, event detector, Overview page.

### Phase 4 — Study dashboard
M8–M14, M16 (M15 placeholder).

### Phase 5 — Outpost dashboard
M17 first, then M8–M12 (Outpost variants), M18–M22.

### Phase 6 — Export system
PDF → Excel → CSV.

### Phase 7 — Comparison view + manage page
Month-over-month charts, KPI delta table, M15 now functional, manage/delete UI.

### Phase 8 — Polish + deployment
GitHub Actions workflow, responsive layout, print CSS, accessibility pass, banner dismissal persistence.

**Banner dismissal:** `localStorage`, keyed `lusu_lens_dismissed_${uploadId}_${flagType}`. Dismissed permanently (survives page reload and browser restart). Clearing localStorage resets all dismissals.

---

## Verification

After Phase 1: Run parsers against September 2024 files — confirm $28,599 Study gross, $77,509 Outpost gross. Zero "Total" phantom items in rankings.

After Phase 2: Upload all 4 September files, confirm IndexedDB contains correct record counts, data quality flags set correctly.

After Phase 5: All 30 metrics render with correct September actuals as documented in spec.

After Phase 6: PDF export renders all dashboard sections with LUSU branding header/footer. Excel workbook contains all 5 sheets with correct data.

After Phase 8: `npm run build` produces a clean `out/` directory. GitHub Actions deploys to Pages without errors.
