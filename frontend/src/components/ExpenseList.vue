<template>
  <div v-if="expenses.length === 0" style="color:#6b7280;text-align:center;padding:24px">
    No expenses yet.
  </div>
  <div v-else class="expense-table-wrap">
    <table class="expense-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Category</th>
          <th>Notes</th>
          <th style="text-align:right">Amount</th>
          <th style="text-align:right">≈ {{ homeCurrency }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="e in sortedExpenses" :key="e.id">
          <td class="nowrap">{{ formatDate(e.date) }}</td>
          <td><span class="badge" :class="e.category">{{ e.category }}</span></td>
          <td class="notes">{{ e.notes || '—' }}</td>
          <td class="nowrap" style="text-align:right;font-weight:600">
            {{ e.currency.trim() }} {{ parseFloat(e.amount).toFixed(2) }}
          </td>
          <td class="nowrap converted" style="text-align:right">
            {{ fmtCurrency(convert(parseFloat(e.amount), e.currency, homeCurrency), homeCurrency) }}
          </td>
          <td>
            <button class="btn btn-danger btn-sm" @click="$emit('delete', e.id)">✕</button>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align:right;font-weight:600;color:#6b7280">
            Total ({{ homeCurrency }})
          </td>
          <td></td>
          <td style="text-align:right;font-weight:700;font-size:1.05rem">
            {{ fmtCurrency(totalInHome, homeCurrency) }}
          </td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { convert, fmtCurrency } from '../utils/currency.js'

const props = defineProps({
  expenses:     { type: Array,  required: true },
  homeCurrency: { type: String, default: 'CHF' },
})
defineEmits(['delete'])

const sortedExpenses = computed(() =>
  [...props.expenses].sort((a, b) => a.date.localeCompare(b.date))
)

const totalInHome = computed(() =>
  props.expenses.reduce(
    (sum, e) => sum + convert(parseFloat(e.amount), e.currency, props.homeCurrency),
    0
  )
)

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'
}
</script>

<style scoped>
.expense-table-wrap { overflow-x: auto; }
.expense-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.expense-table th {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 2px solid #e5e7eb;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.expense-table td {
  padding: 10px 10px;
  border-bottom: 1px solid #f3f4f6;
}
.expense-table tfoot td {
  border-bottom: none;
  border-top: 2px solid #e5e7eb;
  padding-top: 12px;
}
.notes { color: #374151; max-width: 240px; }
.nowrap { white-space: nowrap; }
.converted { color: #059669; font-size: 0.85rem; }
.btn-sm { padding: 4px 8px; font-size: 0.75rem; }

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: capitalize;
}
.badge.food           { background: #fef9c3; color: #854d0e; }
.badge.transport      { background: #dbeafe; color: #1e40af; }
.badge.accommodation  { background: #dcfce7; color: #166534; }
.badge.activities     { background: #f3e8ff; color: #6b21a8; }
.badge.other          { background: #f1f5f9; color: #475569; }
</style>
