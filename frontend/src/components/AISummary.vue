<template>
  <div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <h3>AI Trip Summary</h3>
      <button class="btn btn-primary" :disabled="loading" @click="generate">
        {{ loading ? 'Generating…' : summary ? 'Regenerate' : 'Generate summary' }}
      </button>
    </div>
    <p v-if="error" class="error-msg">{{ error }}</p>
    <div v-if="summary" class="summary-box">
      <p v-for="(line, i) in summaryLines" :key="i">{{ line }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import http from '../api/http'

const props = defineProps({
  tripId: { type: [Number, String], required: true },
})

const summary = ref('')
const loading = ref(false)
const error = ref('')

const summaryLines = computed(() =>
  summary.value.split('\n').filter(l => l.trim())
)

async function generate() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await http.get(`/trips/${props.tripId}/summary`)
    summary.value = data.summary
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to generate summary'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.summary-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  font-size: 0.9rem;
  line-height: 1.7;
  color: #1e293b;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
