# Task 10 — Enhanced AI Summary

## Goal
Replace the basic 3-4 sentence summary with a structured, actionable analysis that genuinely helps the user reflect on their spending and plan better for future trips.

## Deliverables
- `backend/src/prompts/tripSummary.js` — richer prompt + updated mock summary
- `backend/src/routes/ai.js` — pass additional aggregated data to the prompt
- `frontend/src/components/AISummary.vue` — render structured sections instead of plain text

---

## What's wrong with the current version
- Prompt only passes totals and category sums — no daily average, no trip duration, no individual expense notes.
- The model returns a single blob of prose — the frontend just splits on newlines, no visual hierarchy.
- 300 max_tokens is too tight for anything more than a paragraph.
- No actionable advice — user learns nothing they couldn't see from the raw numbers.

---

## Backend changes

### Extra data to aggregate in `ai.js`
Extend the expense query to also fetch `date` and `notes`:
```sql
SELECT amount, currency, category, date, notes FROM expenses WHERE trip_id = $1
```

Then compute and pass to the prompt:
```
tripDays        — end_date - start_date + 1 (integer)
expenseCount    — total number of expenses
dailyAvgInUSD   — total (all converted to USD) / tripDays
topExpense      — { category, amount, currency, notes } — single highest-amount row
unusedCategories— categories from the fixed list that have zero spend
```

### Updated prompt in `tripSummary.js`
Ask the model to respond in **exactly four labelled sections**, using the literal markers shown — makes frontend parsing deterministic.

```
You are a sharp travel finance analyst. Respond in exactly these four sections.
Use the marker lines exactly as shown (they are parsed programmatically).

[OVERVIEW]
One sentence: total spend, currencies used, trip duration, and daily average.

[TOP CATEGORIES]
Three bullet points (•) for the three highest-spending categories.
Each bullet: category name, total in original currency, percentage of trip total.

[INSIGHTS]
Two or three observations the traveller might not notice from the raw numbers.
Examples: unusually high single-day spend, categories that are suspiciously absent,
whether spend is front- or back-loaded across the trip dates.

[BUDGET TIP]
One specific, actionable tip for this exact trip — not generic advice.
Base it on the actual numbers (e.g. "Your accommodation was 48 % of your budget —
booking 2 weeks earlier typically saves 15–20 % on this route.").

--- data ---
Trip: {name} to {destination}
Dates: {start_date} to {end_date} ({tripDays} days, {expenseCount} expenses)
Daily average: ~${dailyAvgInUSD}/day (USD equivalent)
Currencies: {currencies}
Breakdown: {category_breakdown}
Highest single expense: {topExpense.amount} {topExpense.currency} — {topExpense.category} ({topExpense.notes})
Categories with zero spend: {unusedCategories}
```

Set `max_tokens: 600`, `temperature: 0.65`.

### Updated `buildMockSummary`
Return the same four-section format so the frontend always gets the same structure regardless of whether the API key is set.

---

## Frontend changes — `AISummary.vue`

### Parsing
Parse the response text by splitting on the `[SECTION]` markers:
```js
const SECTIONS = ['OVERVIEW', 'TOP CATEGORIES', 'INSIGHTS', 'BUDGET TIP']

function parseSections(raw) {
  // returns [{ title, content }]
}
```

### Rendering
Render each section as a distinct visual block inside `.summary-box`:

| Section        | Style hint                                          |
|----------------|-----------------------------------------------------|
| OVERVIEW       | Larger font, semi-bold, full-width banner           |
| TOP CATEGORIES | Parse `•` bullets into `<ul>` with category colours |
| INSIGHTS       | Normal text, italic                                 |
| BUDGET TIP     | Highlighted box (light yellow background, 💡 icon)  |

If parsing fails (e.g. model ignored the format), fall back to the current line-split plain text display — never break the UI.

### API contract stays the same
The backend still returns `{ summary: "..." }` — no API version bump needed.

---

## Acceptance Criteria
- All four sections rendered visually distinct for any seed trip
- Category bullet points match the pie chart colours from Task 09 (same hex palette)
- Mock summary (no API key) renders the same four-section layout
- Fallback to plain text if section markers are absent
- `max_tokens` increased to 600, `temperature` 0.65
- No extra API endpoints or DB changes
