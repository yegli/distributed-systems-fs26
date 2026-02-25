<template>
  <div v-if="hasExpenses" class="chart-wrap">
    <Doughnut :data="chartData" :options="chartOptions" :plugins="[centerLabelPlugin]" />
  </div>
  <p v-else class="chart-empty">No expenses yet — add one to see the breakdown.</p>
</template>

<script setup>
import { computed } from 'vue'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import { convert, fmtCurrency } from '../utils/currency.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  expenses:     { type: Array,  required: true },
  homeCurrency: { type: String, required: true },
})

// ── Category palette (order is stable; shared with task-10 AI summary colours) ──
const CATEGORIES = ['food', 'transport', 'accommodation', 'activities', 'other']
const CATEGORY_COLORS = {
  food:          '#f59e0b',
  transport:     '#3b82f6',
  accommodation: '#8b5cf6',
  activities:    '#10b981',
  other:         '#6b7280',
}

// ── Aggregation ───────────────────────────────────────────────────────────────
const totals = computed(() => {
  const t = Object.fromEntries(CATEGORIES.map(c => [c, 0]))
  for (const e of props.expenses) {
    const converted = convert(parseFloat(e.amount), e.currency, props.homeCurrency)
    if (e.category in t) t[e.category] += converted
  }
  return t
})

const totalInHome = computed(() =>
  Object.values(totals.value).reduce((s, v) => s + v, 0)
)

const hasExpenses = computed(() => props.expenses.length > 0)

// Only include categories that have spend (keeps legend clean)
const activeCategories = computed(() =>
  CATEGORIES.filter(c => totals.value[c] > 0)
)

// ── Chart.js data ─────────────────────────────────────────────────────────────
const chartData = computed(() => ({
  labels: activeCategories.value.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
  datasets: [{
    data:            activeCategories.value.map(c => totals.value[c]),
    backgroundColor: activeCategories.value.map(c => CATEGORY_COLORS[c]),
    borderColor:     '#fff',
    borderWidth:     2,
    hoverBorderWidth: 3,
  }],
}))

// ── Chart.js options ──────────────────────────────────────────────────────────
const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  cutout: '65%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 16,
        font: { size: 12 },
        usePointStyle: true,
        pointStyleWidth: 10,
      },
    },
    tooltip: {
      callbacks: {
        label(ctx) {
          const pct = totalInHome.value > 0
            ? ((ctx.parsed / totalInHome.value) * 100).toFixed(1)
            : '0.0'
          return ` ${fmtCurrency(ctx.parsed, props.homeCurrency)} (${pct}%)`
        },
      },
    },
  },
}

// ── Center-label plugin (draws total inside the doughnut hole) ────────────────
const centerLabelPlugin = {
  id: 'centerLabel',
  beforeDraw(chart) {
    const { ctx } = chart
    const { top, left, width, height } = chart.chartArea
    const cx = left + width / 2
    const cy = top + height / 2

    ctx.save()

    // Total amount
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#1e293b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(fmtCurrency(totalInHome.value, props.homeCurrency), cx, cy - 9)

    // "total" sub-label
    ctx.font = '11px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#9ca3af'
    ctx.fillText('total', cx, cy + 10)

    ctx.restore()
  },
}
</script>

<style scoped>
.chart-wrap {
  max-width: 320px;
  margin: 0 auto;
}
.chart-empty {
  text-align: center;
  color: #9ca3af;
  font-size: 0.88rem;
  padding: 24px 0;
  margin: 0;
}
</style>
