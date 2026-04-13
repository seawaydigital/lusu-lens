# LUSU Lens — Known Data Quirks

| Quirk | Handling |
|---|---|
| "Total" row in some Outpost product sheets (e.g. 9-23-2024) | Filter by `item.toLowerCase() === 'total'` |
| Auto Pricing Discounts up to -$1,250/day | Separate field, never combined with Discounts |
| Gift card sales as product records | Default exclude by `category === 'Gift Cards'` |
| LU Soccer Buffet: 398-unit $9,950 catering line | Default exclude; own panel |
| Net vs Gross differs 100+ rows/venue | Use Gross; log count; info banner |
| Outpost data starts 9-10-2024 (not 9-3) | Incomplete month warning |
| FRIDAY WINGS item name exact match | M21 matches `item.trim().toUpperCase() === 'FRIDAY WINGS'` |
| Women's Day Promo / Spring Drinks category | Include in seasonal tracker |
| House Account payment type | Group into "Other" unless >5% volume |
| Some rows: Net=0, Gross>0 | Keep; use Gross; do not filter |
| Outpost 9-18-2024: Non-Revenue Items = -500 | Parse separately; do not net against gross |
