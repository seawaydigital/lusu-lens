# LUSU Lens — Session Handoff

Last updated: 2026-04-13

---

## Current State of the App

The app is fully functional and deployed. Both venue dashboards are feature-complete for the current scope.

### What exists

**Upload flow (`/`)**
- Drop zone accepts `.xlsx` files
- `fileDetector.ts` auto-identifies venue and file type from content
- Parses summary + product files, stores in IndexedDB
- Runs data quality checks at upload time, stores flags on `UploadRecord`

**Study dashboard (`/dashboard/study`)**
- Key Insights (4 auto-surfaced cards via `AutoInsights`)
- Revenue KPIs with dollar subvalues on Tip Rate and Discount Rate
- Food Attach Rate KPI (when product data present)
- Daily Revenue Trend with average reference line
- Weekly Performance: `WeeklyView` (heatmap) + `DaypartChart`
- Products: `CategoryDonut` + `TopItemsChart`
- Menu Category Breakdown: `SectionMixChart`
- Patterns: `DowChart`, `HotColdSplit`, `FoodAttachRate`, `SizeDistribution`, `SeasonalItemTracker`
- Payment: `PaymentMethodChart`

**Outpost dashboard (`/dashboard/outpost`)**
- Key Insights (4 auto-surfaced cards: event %, regular night avg, tips $, strongest DOW)
- Event Nights: `EventDayAnalysis` + `DoorRevenueTracker` (cover charge revenue + attendance)
- Revenue KPIs with dollar subvalues on Tip Rate and Manual Discounts
- Daily Revenue Trend with event day dots + average reference line + optional 7-day rolling avg
- Weekly Performance: `WeeklyView` + `DaypartChart`
- Products: `CategoryDonut` + `TopItemsChart`
- Menu Category Breakdown: `SectionMixChart`
- Alcohol & Beverage: `DowChart` (with event toggle), `AlcoholFoodSplit`, `DraftVsPackaged`, `HappyHourImpact`
- Food: `FridayWingsTracker`, `CateringRevenue`
- Payment: `PaymentMethodChart`

**Overview dashboard (`/dashboard`)**
- Side-by-side KPI comparison for both venues
- Loads selected months for both venues in parallel
- No venue logos in section headers (removed in a prior session)

**Manage page (`/manage`)**
- Lists all uploads with data quality flag badges
- Delete individual upload (with confirmation)
- Delete all uploads (with confirmation)

**Compare page (`/compare`)**
- Month-over-month comparison for a single venue

**Multi-month selection**
- `MonthSelector` sets `?months=YEAR-MONTH,YEAR-MONTH,...` in the URL
- All dashboard pages read this param and load data in parallel
- Single month → `DataQualityBanner`, multiple → `DataQualityBannerGroup`

**Export**
- `ExportButton` — exports as PDF (html2canvas + jsPDF), CSV, or Excel

---

## Components Reference

### `AutoInsights` (`src/components/shared/AutoInsights.tsx`)
Props: `summaries: DailySummary[]`, `venue: 'study' | 'outpost'`, `eventDays?: EventDay[]`

Renders 4 insight cards. Study: best day, top DOW, avg orders/day (or revenue/customer if `guestCount` available), discounts $. Outpost: event revenue %, regular night avg, tips $, strongest regular DOW (event-adjusted).

### `KpiCard` (`src/components/shared/KpiCard.tsx`)
Props: `label`, `value`, `subValue?`, `hint?`, `trend?`, `flag?`, `accentColor?`

- `hint` renders a `HelpCircle` icon with CSS hover tooltip
- `subValue` renders a smaller line below the main value
- `accentColor` is a Tailwind border class (e.g. `"border-study-gold"`)

### `DailyTrendChart` (`src/components/shared/DailyTrendChart.tsx`)
Props: `summaries`, `accentColor`, `eventDays?`, `showRollingAvg?`

- Event days rendered as red dots
- `showRollingAvg` adds a 7-day rolling average line (used on Outpost)
- Average reference line always shown (dashed gray, labeled)

### `DataQualityBannerGroup` (`src/components/shared/DataQualityBannerGroup.tsx`)
Accepts `uploads: UploadRecord[]`. Groups flags by type across all uploads and renders max 3 summary banners. Each is dismissible. Extracts data from flag messages via regex.

### `DoorRevenueTracker` (`src/components/outpost/DoorRevenueTracker.tsx`)
Reads products where `category.toUpperCase() === 'DOOR REVENUE'`. Cover charge items matched with `/^\$\d+\s+COVER$/i`. Shows per-event cards: attendance, door revenue, bar+food revenue, revenue per head.

### `SectionMixChart` (`src/components/shared/SectionMixChart.tsx`)
Aggregates `sections` from `DailySummary`. Excludes `ADD ONS`, `OTHER REVENUE`, `NON-ALC BEVERAGES`. Shows "re-upload required" if summaries lack `sections` data.

### `DaypartChart` (`src/components/shared/DaypartChart.tsx`)
Stacked bar by day of week: BREAKFAST / LUNCH / DINNER/LATE NIGHT. Shows "re-upload required" if summaries lack `dayparts` data.

### `WeeklyView` (`src/components/shared/WeeklyView.tsx`)
Groups summaries by ISO week (Monday anchor). Table: rows = Mon–Sun, columns = calendar weeks. Cells colored at varying opacity of `accentColor`. Weekly total footer.

---

## Data Files Used in Testing

Real POS export files (January 2025) were analyzed when designing the BI features. Key observations:
- Outpost January 2025 had several high-revenue event nights (detected by `eventDetector`)
- Study January 2025 had DAYPARTS and SECTIONS parsed correctly
- Gift card sales appear in product data under category `Gift Cards`
- Catering appears under category `CATERING` in Outpost product data
- Auto Pricing Discounts (Happy Hour) can reach -$1,250/day at Outpost

---

## Potential Next Features

Things discussed or noticed as candidates for future work:

1. **Month-over-month delta KPIs** — Show `+12% vs last month` on KpiCards when 2+ months selected
2. **Goal/target tracking** — Let managers set monthly revenue targets; show progress bar
3. **Customer count trend** — `guestCount` from CLOSED TICKETS section, only available after re-upload
4. **Inventory / COGS integration** — Currently no cost data; would require a new file type
5. **Staff discount analysis** — Break down which discount types (void, comp, manual) are driving the rate
6. **Print-friendly view** — The PDF export works but is imperfect; a CSS print stylesheet would be cleaner
7. **Keyboard shortcut for month navigation** — Arrow keys to step through months

---

## Known Data Quirks

See `KNOWN_ISSUES.md` in the project root for a full table. Key ones:

- Outpost data may start mid-month (triggers `incomplete_month` warning)
- Some rows have Net=0, Gross>0 — keep them, use Gross
- "Total" row appears in some product sheets — filter by `item.toLowerCase() === 'total'`
- Auto Pricing Discounts are a separate field from manual Discounts
- `FRIDAY WINGS` matched exactly: `item.trim().toUpperCase() === 'FRIDAY WINGS'`

---

## Re-upload Requirement

`DaypartChart`, `SectionMixChart`, and the Revenue per Customer insight in `AutoInsights` all depend on fields added to `DailySummary` after the initial parser was written (`dayparts`, `sections`, `guestCount`). Months uploaded before these fields were added will show a "Re-upload this month to see this data" message. No DB migration is needed — just delete the old upload and re-upload the same file.

---

## Deployment Notes

- Push to `main` → GitHub Actions builds and deploys to Pages automatically
- `basePath: '/lusu-lens'` — all internal links and `<Image>` `src` paths must be relative or use `/lusu-lens/...`
- Logo images: `public/lusu-lens/logos/study.png` and `outpost.png`
- The `out/` directory is the static export — do not commit it manually
