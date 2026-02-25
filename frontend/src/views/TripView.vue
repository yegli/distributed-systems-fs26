<template>
  <div class="page">
    <div class="nav">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn btn-ghost" @click="router.push('/')">← Trips</button>
        <h1 v-if="trip">{{ trip.name }}</h1>
      </div>
      <button class="btn btn-ghost" @click="handleLogout">Logout</button>
    </div>

    <div v-if="loading" style="color:#6b7280;text-align:center;padding:40px">Loading…</div>
    <div v-else-if="!trip" style="color:#dc2626;text-align:center;padding:40px">Trip not found.</div>

    <template v-else>
      <!-- Trip meta -->
      <div class="card" style="margin-bottom:20px">
        <div class="trip-meta">
          <div>
            <div class="meta-label">Destination</div>
            <div class="meta-value">{{ trip.destination || '—' }}</div>
          </div>
          <div>
            <div class="meta-label">Dates</div>
            <div class="meta-value">{{ formatDate(trip.start_date) }} – {{ formatDate(trip.end_date) }}</div>
          </div>
          <div>
            <div class="meta-label">≈ Total ({{ homeCurrency }})</div>
            <div class="meta-value meta-total">{{ fmtCurrency(totalInHome, homeCurrency) }}</div>
          </div>
          <div>
            <div class="meta-label">Home currency</div>
            <div class="currency-toggle">
              <button
                v-for="c in HOME_CURRENCIES"
                :key="c"
                class="btn btn-sm"
                :class="c === homeCurrency ? 'btn-primary' : 'btn-ghost'"
                @click="setHomeCurrency(c)"
              >{{ c }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Spending breakdown chart -->
      <div class="card" style="margin-bottom:20px">
        <h3 style="margin-bottom:14px">Spending breakdown</h3>
        <ExpenseChart :expenses="trip.expenses" :homeCurrency="homeCurrency" />
      </div>

      <!-- AI Summary -->
      <div class="card" style="margin-bottom:20px">
        <AISummary :tripId="trip.id" />
      </div>

      <!-- Add expense -->
      <div class="card" style="margin-bottom:20px">
        <div class="add-expense-header">
          <h3>Add expense</h3>
          <VoiceButton :tripId="trip.id" @expense-added="onExpenseAdded" />
        </div>
        <ExpenseForm :tripId="trip.id" @submitted="onExpenseAdded" />
      </div>

      <!-- Expense list -->
      <div class="card">
        <h3 style="margin-bottom:14px">Expenses ({{ trip.expenses.length }})</h3>
        <ExpenseList
          :expenses="trip.expenses"
          :homeCurrency="homeCurrency"
          @delete="onExpenseDeleted"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import http from '../api/http'
import ExpenseList from '../components/ExpenseList.vue'
import ExpenseForm from '../components/ExpenseForm.vue'
import AISummary from '../components/AISummary.vue'
import VoiceButton from '../components/VoiceButton.vue'
import ExpenseChart from '../components/ExpenseChart.vue'
import {
  HOME_CURRENCIES,
  convert,
  fmtCurrency,
  getStoredHomeCurrency,
  setStoredHomeCurrency,
} from '../utils/currency.js'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const trip = ref(null)
const loading = ref(true)
const homeCurrency = ref(getStoredHomeCurrency())

function setHomeCurrency(c) {
  homeCurrency.value = c
  setStoredHomeCurrency(c)
}

onMounted(async () => {
  try {
    const { data } = await http.get(`/trips/${route.params.id}`)
    trip.value = data
  } catch {
    trip.value = null
  } finally {
    loading.value = false
  }
})

const totalInHome = computed(() => {
  if (!trip.value) return 0
  return trip.value.expenses.reduce(
    (sum, e) => sum + convert(parseFloat(e.amount), e.currency, homeCurrency.value),
    0
  )
})

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

function onExpenseAdded(expense) {
  trip.value.expenses.push(expense)
}

async function onExpenseDeleted(id) {
  try {
    await http.delete(`/expenses/${id}`)
    trip.value.expenses = trip.value.expenses.filter(e => e.id !== id)
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to delete expense')
  }
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.trip-meta {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.meta-label { font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
.meta-value { font-size: 1rem; margin-top: 2px; }
.meta-total { font-size: 1.4rem; font-weight: 700; color: #2563eb; }
.currency-toggle { display: flex; gap: 4px; margin-top: 4px; }
.btn-sm { padding: 4px 10px; font-size: 0.78rem; }
.add-expense-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.add-expense-header h3 { margin: 0; }
</style>
