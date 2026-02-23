<template>
  <div class="trip-card card" @click="$emit('click')">
    <div class="trip-card-header">
      <h3>{{ trip.name }}</h3>
      <span class="destination">{{ trip.destination || 'No destination' }}</span>
    </div>
    <div class="trip-card-dates">
      {{ formatDate(trip.start_date) }} – {{ formatDate(trip.end_date) }}
    </div>
    <div class="trip-card-total">
      {{ formatAmount(total) }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  trip: { type: Object, required: true },
  total: { type: Number, default: 0 },
})
defineEmits(['click'])

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

function formatAmount(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
</script>

<style scoped>
.trip-card {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: box-shadow 0.15s;
}
.trip-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.12); }
.trip-card-header { display: flex; flex-direction: column; gap: 2px; }
.trip-card-header h3 { font-size: 1rem; font-weight: 600; }
.destination { font-size: 0.8rem; color: #6b7280; }
.trip-card-dates { font-size: 0.8rem; color: #6b7280; }
.trip-card-total { font-size: 1.5rem; font-weight: 700; color: #2563eb; margin-top: 4px; }
</style>
