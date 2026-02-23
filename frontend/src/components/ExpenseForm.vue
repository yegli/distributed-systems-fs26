<template>
  <form @submit.prevent="submit" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div class="form-group">
      <label>Amount *</label>
      <input v-model="form.amount" type="number" step="0.01" min="0.01" placeholder="0.00" required />
    </div>
    <div class="form-group">
      <label>Currency</label>
      <select v-model="form.currency">
        <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>
    <div class="form-group">
      <label>Category *</label>
      <select v-model="form.category" required>
        <option value="" disabled>Select…</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
    </div>
    <div class="form-group">
      <label>Date *</label>
      <input v-model="form.date" type="date" required />
    </div>
    <div class="form-group" style="grid-column:1/-1">
      <label>Notes</label>
      <input v-model="form.notes" type="text" placeholder="Optional description" />
    </div>
    <p v-if="error" class="error-msg" style="grid-column:1/-1">{{ error }}</p>
    <div style="grid-column:1/-1">
      <button class="btn btn-primary" :disabled="loading">
        {{ loading ? 'Adding…' : 'Add expense' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref } from 'vue'
import http from '../api/http'

const props = defineProps({
  tripId: { type: [Number, String], required: true },
})
const emit = defineEmits(['submitted'])

const categories = ['food', 'transport', 'accommodation', 'activities', 'other']
const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'THB']

const form = ref({ amount: '', currency: 'USD', category: '', date: '', notes: '' })
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await http.post('/expenses', {
      trip_id: props.tripId,
      amount: parseFloat(form.value.amount),
      currency: form.value.currency,
      category: form.value.category,
      date: form.value.date,
      notes: form.value.notes || undefined,
    })
    emit('submitted', data)
    form.value = { amount: '', currency: 'USD', category: '', date: '', notes: '' }
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to add expense'
  } finally {
    loading.value = false
  }
}
</script>
