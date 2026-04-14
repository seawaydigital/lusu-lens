# Sprint 1 — Menu Intelligence Design Spec
**Date:** 2026-04-13
**Status:** Approved

---

## Overview

Add five menu-analytics features to LUSU Lens that answer the question: **"What should we be doing differently with our menu?"** All features are client-side, derive from existing `ProductRecord[]` and `DailySummary[]` data, and follow the established pattern of metric function → Recharts component → dashboard page placement.

---

## Architecture

### Guiding constraints
- No new IndexedDB stores, no DB_VERSION bump
- No new data fields required — all derivable from existing `ProductRecord` (`item`, `category`, `size`, `quantity`, `gross`, `date`, `venue`)
- Metric logic stays in `src/lib/metrics/`, rendering in `src/components/`
- Recharts for all charts; Tailwind design tokens throughout
- No Set spread syntax (use `Array.from()`)

### New type additions (`src/types/index.ts`)
```ts
export type MenuTier = 'star' | 'plowhorse' | 'puzzle' | 'dog'

export interface MenuEngineeringItem {
  item: string
  category: string
  quantity: number
  revenue: number
  tier: MenuTier
}
```

### New metric functions
| Function | File | Used by |
|---|---|---|
| `calcMenuEngineering(products)` | `sharedMetrics.ts` | `MenuAbcAnalysis` |
> **Note:** `sharedMetrics.ts` currently only imports `DailySummary`. Adding `calcMenuEngineering` requires adding `ProductRecord` to its import: `import type { DailySummary, ProductRecord } from '@/types'`.
| `calcSizeDistributionTrend(products)` | `studyMetrics.ts` | `SizeDistribution` |
| `calcLtoVsCore(products)` | `studyMetrics.ts` | `LtoVsCoreChart` |
| `calcAlcoholCategoryTrend(products)` | `outpostMetrics.ts` | `AlcoholCategoryTrend` |
| `calcOutpostFoodAttach(products, eventDays)` | `outpostMetrics.ts` | `OutpostFoodAttach` |

### New / modified components
| Component | Status | Location |
|---|---|---|
| `MenuAbcAnalysis` | New | `src/components/shared/` |
| `LtoVsCoreChart` | New | `src/components/study/` |
| `AlcoholCategoryTrend` | New | `src/components/outpost/` |
| `OutpostFoodAttach` | New | `src/components/outpost/` |
| `SizeDistribution` | Enhanced | `src/components/study/` |

### Modified pages
- `src/app/dashboard/study/page.tsx` — add `LtoVsCoreChart`, enhanced `SizeDistribution`, `MenuAbcAnalysis`
- `src/app/dashboard/outpost/page.tsx` — add `AlcoholCategoryTrend`, `OutpostFoodAttach`, `MenuAbcAnalysis`

---

## Feature 1 — ABC Menu Analysis (`MenuAbcAnalysis`)

### Purpose
Classify every menu item into a performance quadrant so managers have a data-backed list of items to promote, reprice, or remove.

### Algorithm (`calcMenuEngineering`)
1. Group `ProductRecord[]` by `item` → sum `quantity` and `gross` per item
2. Compute median quantity and median revenue across all items
3. Assign tier by comparing each item to both medians:
   - `quantity >= medianQty && revenue >= medianRev` → **star**
   - `quantity >= medianQty && revenue < medianRev` → **plowhorse**
   - `quantity < medianQty && revenue >= medianRev` → **puzzle**
   - `quantity < medianQty && revenue < medianRev` → **dog**
4. Return `MenuEngineeringItem[]`

### Visualization
- **Scatter plot** (Recharts `ScatterChart`): X = quantity, Y = revenue. Reference lines at median X and median Y create four quadrants. Dots colored by tier. Tooltip shows item name, category, revenue, units.
- **Tabbed table** below scatter: tabs = Stars / Plowhorses / Puzzles / Dogs. Dogs tab is the primary actionable output. Each row: item name, category, units sold, revenue.
- Tier colors: Stars = study-gold `#C4A952`, Plowhorses = lusu-cyan `#00B4E6`, Puzzles = purple `#7C3AED`, Dogs = gray `#9CA3AF`

### Props
```ts
interface MenuAbcAnalysisProps {
  products: ProductRecord[]
  venue: 'study' | 'outpost'
}
```

### Placement
Both Study and Outpost dashboards, Products section.

### Edge cases
- Fewer than 4 unique items: show "Not enough menu data" placeholder
- All items identical quantity/revenue: all tier as star (degenerate case, acceptable)

---

## Feature 2 — Size Upgrade Rate Trend (`SizeDistribution` enhancement)

### Purpose
Track whether upselling to larger sizes is improving or declining over time — a direct proxy for staff upsell behaviour.

### Algorithm (`calcSizeDistributionTrend`)
1. Filter products to those with non-null `size`
2. Group by month using `date.slice(0, 7)` → yields `'YYYY-MM'` (ISO zero-padded, e.g. `'2025-01'`)
3. For each month: compute each size's revenue as `%` of that month's total sized-drink revenue
4. Return `{ month: string; sizes: Record<string, number> }[]` sorted by month ascending

### Visualization
- Two-tab toggle added to existing `SizeDistribution` card:
  - **Distribution** tab (default): existing bar chart, always visible
  - **Trend** tab: Recharts `LineChart`, one line per size, X = month label, Y = % share (0–100). Only rendered when 2+ months selected; tab is hidden for single-month views.
- Line colors assigned from a fixed palette cycling through: study-gold, lusu-cyan, lusu-navy, gray

### Props — no change to existing props signature
Trend data derived internally from the same `products: ProductRecord[]` already passed. The number of distinct months is detected inside the component — no new prop needed:
```ts
const monthCount = Array.from(new Set(products.map(p => p.date.slice(0, 7)))).length
```
The Trend tab is hidden when `monthCount < 2`.

### Edge cases
- No sized products in data: existing null-return behaviour unchanged
- Only 1 month selected: Trend tab hidden, Distribution tab shown as today

---

## Feature 3 — LTO vs Core Revenue Split (`LtoVsCoreChart`)

### Purpose
Show whether limited-time/seasonal items are adding net-new revenue or cannibalising core menu sales.

### Algorithm (`calcLtoVsCore`)
**Multi-month path (2+ months selected):**
1. Determine all unique months in the dataset by slicing `date.slice(0, 7)` → yields `'YYYY-MM'` (ISO zero-padded). All `month` fields in returned data use this `'YYYY-MM'` format. Display labels are formatted for readability (e.g. `'Jan 2025'`) but the key used for grouping and joining is always `'YYYY-MM'`.
2. For each item, count how many distinct `'YYYY-MM'` months it appears in
3. `core` = appears in ≥ 50% of months; `lto` = appears in < 50% of months
4. Group by month → sum `core` gross and `lto` gross per month
5. Return `{ month: string; core: number; lto: number }[]` + `ltoItems: { item: string; months: string[]; revenue: number }[]`

**Single-month fallback:**
- Return `null` → component renders "Select 2+ months to see LTO analysis" placeholder

### Visualization
- **Stacked bar chart** by month: Core = study-gold, LTO = lusu-cyan
- **LTO items table** below: item, active months, total revenue. Sorted by revenue descending.
- **Insight line**: `"LTO items contributed X% of revenue. Core revenue [grew / held steady / declined] while LTOs were active."`
  - Compare **first month core revenue vs last month core revenue** (first-to-last overall delta). "grew" = delta > +3%, "declined" = delta < -3%, otherwise "held steady". This applies for 2-month and 3+ month datasets alike — it measures the net direction over the full selected period.

### Props
```ts
interface LtoVsCoreChartProps {
  products: ProductRecord[]
}
```

### Placement
Study dashboard, Products section, below `SeasonalItemTracker`.

---

## Feature 4 — Alcohol Category Mix Trend (`AlcoholCategoryTrend`)

### Purpose
Show whether beer, spirits, or wine is gaining or losing share over time — informs stocking, promotions, and specials decisions.

### Algorithm (`calcAlcoholCategoryTrend`)
> **Note:** `ALCOHOL_CATEGORIES` is a module-local (non-exported) `const` in `outpostMetrics.ts`. `calcAlcoholCategoryTrend` lives in the same file and reuses it directly — do not re-declare or import it.

1. Filter to alcohol-only products by checking `ALCOHOL_CATEGORIES.has(p.category.toLowerCase())` — reuse the module-local constant already in `outpostMetrics.ts`
2. Map categories to buckets:
   - **Beer**: `beer - draft`, `beer & coolers - bottles/cans`
   - **Spirits**: `liquor`
   - **Wine**: `wine`
   - **Other**: remaining `ALCOHOL_CATEGORIES` members including `study alcohol` (expected count = 0 for Outpost data, but handled gracefully as a catch-all)
3. Group by month → compute each bucket as % of that month's total alcohol revenue
4. Return `{ month: string; beer: number; spirits: number; wine: number; other: number }[]`

**Single-month fallback:** return the same structure as a single-entry array → renders as a horizontal bar breakdown (not a trend).

### Visualization
- **2+ months**: 100% stacked bar chart (Recharts `BarChart` with stacked bars). Colors: Beer = lusu-navy `#1B3A6B`, Spirits = outpost-red `#E63946`, Wine = `#7C3AED`, Other = `#9CA3AF`. Tooltip shows both % and $ for each bucket.
- **1 month**: horizontal bar breakdown (same layout as existing `AlcoholFoodSplit` legend style)

### Props
```ts
interface AlcoholCategoryTrendProps {
  products: ProductRecord[]
}
```
Single-month detection uses the same approach as `SizeDistribution`: derive distinct month count internally from product dates — `Array.from(new Set(products.map(p => p.date.slice(0, 7)))).length`. No `selectedMonths` prop needed. Month keys throughout are `'YYYY-MM'` (ISO zero-padded, consistent with Features 2 and 3).

### Placement
Outpost dashboard, Alcohol & Beverage section, new card below `AlcoholFoodSplit`.

---

## Feature 5 — Outpost Food Attach Rate (`OutpostFoodAttach`)

### Purpose
Track what % of Outpost revenue comes from food, and whether that rate drops on event nights — a direct signal for staff training focus.

### Algorithm (`calcOutpostFoodAttach`)
```ts
calcOutpostFoodAttach(
  products: ProductRecord[],
  eventDays: Set<string>  // ISO date strings from detectEventDays()
): { overall: number; regular: number; event: number | null; foodGross: number; totalGross: number }
```
1. Exclude `door revenue`, `catering`, and `events` categories — all three members of `CATERING_CATEGORIES` (same exclusions as `calcAlcoholFoodSplit`). Use `p.category.toLowerCase()` before the `Set.has()` check, consistent with every other category filter in `outpostMetrics.ts`
2. For each day, compute `foodGross / totalGross`
3. Average across all days → `overall`
4. Split by event vs regular using `eventDays` set → `event` and `regular`
5. If no event days detected, `event` = `null`

### Visualization
- **KPI card** (matching Study `FoodAttachRate` style): large % number, subvalue = `$X food / $Y total`
- **Split bar**: two horizontal bars — "Regular Nights" and "Event Nights" (hidden if no events detected)
- **Insight line** (dynamic):
  - Event attach > regular: `"Food ordering is stronger on event nights — good F&B synergy"`
  - Event attach < regular by > 5pp: `"Food attach drops Xpp on event nights — opportunity to promote food during events"`
  - No events: compare against 30% benchmark (same target logic as Study version)

### Props
```ts
interface OutpostFoodAttachProps {
  products: ProductRecord[]
  eventDays: Set<string>
}
```

### Placement
Outpost dashboard, Food section, above `FridayWingsTracker`.

---

## Implementation Order

1. **Types** — add `MenuTier`, `MenuEngineeringItem` to `src/types/index.ts`
2. **Metric functions** — add all five to their respective `lib/metrics/` files
3. **Components** — build in dependency order:
   - `MenuAbcAnalysis` (shared, no dependencies on other new components)
   - `SizeDistribution` enhancement
   - `LtoVsCoreChart`
   - `AlcoholCategoryTrend`
   - `OutpostFoodAttach`
4. **Page wiring** — add to Study and Outpost dashboard pages
5. **Build validation** — `npm run build` must pass before commit

---

## Testing Checklist
- [ ] ABC scatter renders with correct quadrant placement for known test data
- [ ] `calcMenuEngineering` returns correct tiers when items straddle the median
- [ ] Size trend tab hidden on single-month; visible on 2+ months
- [ ] LTO vs Core placeholder shown on single-month selection
- [ ] `calcLtoVsCore` classifies items correctly at exactly 50% threshold
- [ ] Alcohol trend renders as horizontal bar (1 month) and stacked bar (2+ months)
- [ ] `calcOutpostFoodAttach` event/regular split matches `detectEventDays()` output
- [ ] `OutpostFoodAttach` renders correctly when `event` is `null` (no event days detected) — split bar hidden, insight falls back to 30% benchmark
- [ ] `npm run build` passes with no TypeScript errors
