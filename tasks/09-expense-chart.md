# Task 09 — Expense Category Pie Chart

## Goal
Visualise how a trip's budget is split across the five expense categories using a doughnut chart on the trip detail page.

## Deliverables
- `frontend/src/components/ExpenseChart.vue` — new self-contained chart component
- `frontend/src/views/TripView.vue` — wire in the new component (one import + one line in template)
- `package.json` (frontend) — add `chart.js` + `vue-chartjs` dependencies

No backend changes required — all expense data is already loaded by TripView.

---

## Stack choice
Use **Chart.js + vue-chartjs** (`chart.js` ~200 KB minified, `vue-chartjs` thin wrapper).
No server-side changes, no extra API calls.

```bash
cd frontend && npm install chart.js vue-chartjs
```

---

## Component: `ExpenseChart.vue`

### Props
| Prop           | Type    | Description                                |
|----------------|---------|--------------------------------------------|
| `expenses`     | Array   | The raw expense objects already in TripView |
| `homeCurrency` | String  | Active home currency (`USD`/`EUR`/`CHF`)   |

### Behaviour
1. Aggregate expenses by category, converting each to `homeCurrency` via `convert()` from `currency.js`.
2. Categories (fixed order / colour palette):
   | Category      | Colour  |
   |---------------|---------|
   | food          | #f59e0b |
   | transport     | #3b82f6 |
   | accommodation | #8b5cf6 |
   | activities    | #10b981 |
   | other         | #6b7280 |
3. Use the `Doughnut` chart type from `vue-chartjs`.
4. Show the **total in home currency** as a centred label inside the doughnut hole (CSS overlay, not canvas).
5. Tooltip shows: `Category — X.XX CCY (NN%)`.
6. If `expenses` is empty, render a subtle placeholder text instead of an empty chart.

### Layout hints
- Fix the chart canvas to `max-width: 320px; margin: 0 auto` so it doesn't stretch on wide screens.
- Legend below the chart, using Chart.js built-in legend (`position: 'bottom'`).

---

## TripView integration
Add `ExpenseChart` between the **trip meta card** and the **AI Summary card**:

```html
<!-- Expense chart -->
<div class="card" style="margin-bottom:20px">
  <h3 style="margin-bottom:14px">Spending breakdown</h3>
  <ExpenseChart :expenses="trip.expenses" :homeCurrency="homeCurrency" />
</div>
```

The chart reacts to the home-currency picker automatically because `homeCurrency` is already a reactive `ref` in TripView.

---

## Acceptance Criteria
- Chart renders with correct proportions for all seed trips (Thailand, Japan, NYC, etc.)
- Switching home currency updates the chart totals and centre label in real time
- Adding or deleting an expense via the form immediately updates the chart (no page reload)
- Empty state handled gracefully (no JS errors)
- No backend changes required
