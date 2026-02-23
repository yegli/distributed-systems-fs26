<template>
  <div class="page">
    <div class="nav">
      <h1>Holiday Expense Tracker</h1>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:0.85rem;color:#6b7280">{{ auth.email }}</span>
        <button class="btn btn-ghost" @click="handleLogout">Logout</button>
      </div>
    </div>

    <!-- New trip form -->
    <div class="card" style="margin-bottom:24px">
      <h3 style="margin-bottom:14px">New trip</h3>
      <form @submit.prevent="createTrip" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="grid-column:1/-1">
          <label>Trip name *</label>
          <input v-model="newTrip.name" placeholder="e.g. Japan 2026" required />
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label>Destination</label>
          <input v-model="newTrip.destination" placeholder="e.g. Tokyo, Japan" />
        </div>
        <div class="form-group">
          <label>Start date</label>
          <input v-model="newTrip.start_date" type="date" />
        </div>
        <div class="form-group">
          <label>End date</label>
          <input v-model="newTrip.end_date" type="date" />
        </div>
        <p v-if="tripError" class="error-msg" style="grid-column:1/-1">{{ tripError }}</p>
        <div style="grid-column:1/-1">
          <button class="btn btn-primary" :disabled="creatingTrip">
            {{ creatingTrip ? 'Creating…' : 'Create trip' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Trip list -->
    <div v-if="loading" style="color:#6b7280;text-align:center;padding:40px">Loading…</div>
    <div v-else-if="trips.length === 0" class="card" style="text-align:center;color:#6b7280;padding:40px">
      No trips yet — create one above.
    </div>
    <div v-else class="trip-grid">
      <TripCard
        v-for="trip in trips"
        :key="trip.id"
        :trip="trip"
        :total="tripTotals[trip.id] || 0"
        @click="router.push(`/trips/${trip.id}`)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import http from '../api/http'
import TripCard from '../components/TripCard.vue'

const router = useRouter()
const auth = useAuthStore()

const trips = ref([])
const tripTotals = ref({})
const loading = ref(true)

const newTrip = ref({ name: '', destination: '', start_date: '', end_date: '' })
const tripError = ref('')
const creatingTrip = ref(false)

onMounted(async () => {
  try {
    const [tripsRes, expensesRes] = await Promise.all([
      http.get('/trips'),
      http.get('/expenses'),
    ])
    trips.value = tripsRes.data
    // Aggregate total spend per trip client-side
    const totals = {}
    for (const e of expensesRes.data) {
      totals[e.trip_id] = (totals[e.trip_id] || 0) + parseFloat(e.amount)
    }
    tripTotals.value = totals
  } finally {
    loading.value = false
  }
})

async function createTrip() {
  tripError.value = ''
  creatingTrip.value = true
  try {
    const { data } = await http.post('/trips', {
      name: newTrip.value.name,
      destination: newTrip.value.destination || undefined,
      start_date: newTrip.value.start_date || undefined,
      end_date: newTrip.value.end_date || undefined,
    })
    trips.value.unshift(data)
    newTrip.value = { name: '', destination: '', start_date: '', end_date: '' }
  } catch (err) {
    tripError.value = err.response?.data?.error || 'Failed to create trip'
  } finally {
    creatingTrip.value = false
  }
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.trip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
</style>
