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
      <!-- Structured four-section view -->
      <template v-if="sections">
        <div v-for="sec in sections" :key="sec.title" :class="['section', sectionClass(sec.title)]">
          <div class="section-label">{{ sec.title }}</div>

          <!-- TOP CATEGORIES: parse • bullets -->
          <ul v-if="sec.title === 'TOP CATEGORIES'" class="bullet-list">
            <li v-for="(bullet, i) in parseBullets(sec.content)" :key="i">
              <span class="bullet-dot" :style="{ background: bulletColor(bullet) }"></span>
              {{ bullet }}
            </li>
          </ul>

          <!-- All other sections: plain text -->
          <p v-else class="section-body">{{ sec.content }}</p>
        </div>
      </template>

      <!-- Fallback: plain line-split text -->
      <template v-else>
        <p v-for="(line, i) in fallbackLines" :key="i">{{ line }}</p>
      </template>
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

// ── Section parsing ───────────────────────────────────────────────────────────

const SECTION_TITLES = ['OVERVIEW', 'TOP CATEGORIES', 'INSIGHTS', 'BUDGET TIP']

function parseSections(raw) {
  const result = []
  for (let i = 0; i < SECTION_TITLES.length; i++) {
    const marker = `[${SECTION_TITLES[i]}]`
    const start = raw.indexOf(marker)
    if (start === -1) return null // marker missing → fall back to plain text
    let end = raw.length
    for (let j = i + 1; j < SECTION_TITLES.length; j++) {
      const nextIdx = raw.indexOf(`[${SECTION_TITLES[j]}]`)
      if (nextIdx !== -1 && nextIdx < end) end = nextIdx
    }
    result.push({ title: SECTION_TITLES[i], content: raw.slice(start + marker.length, end).trim() })
  }
  return result
}

const sections = computed(() => summary.value ? parseSections(summary.value) : null)
const fallbackLines = computed(() => summary.value.split('\n').filter(l => l.trim()))

// ── Bullet helpers ────────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  food: '#f59e0b', transport: '#3b82f6', accommodation: '#8b5cf6',
  activities: '#10b981', other: '#6b7280',
}

function parseBullets(content) {
  return content.split('\n').map(l => l.replace(/^•\s*/, '').trim()).filter(Boolean)
}

function bulletColor(line) {
  const lower = line.toLowerCase()
  for (const [cat, color] of Object.entries(CATEGORY_COLORS)) {
    if (lower.startsWith(cat)) return color
  }
  return '#6b7280'
}

// ── Section styling ───────────────────────────────────────────────────────────

function sectionClass(title) {
  return {
    'OVERVIEW': 'section-overview',
    'TOP CATEGORIES': 'section-categories',
    'INSIGHTS': 'section-insights',
    'BUDGET TIP': 'section-tip',
  }[title] || ''
}

// ── Data fetching ─────────────────────────────────────────────────────────────

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
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section {
  border-radius: 8px;
  padding: 12px 14px;
}

.section-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 6px;
  color: #64748b;
}

/* OVERVIEW — subtle banner */
.section-overview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
.section-overview .section-body {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.5;
  margin: 0;
}

/* TOP CATEGORIES — clean list */
.section-categories {
  background: #fafafa;
  border: 1px solid #f1f5f9;
}
.bullet-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bullet-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: #334155;
}
.bullet-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* INSIGHTS — italic */
.section-insights {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
.section-insights .section-body {
  font-style: italic;
  font-size: 0.88rem;
  color: #475569;
  line-height: 1.65;
  margin: 0;
  white-space: pre-line;
}

/* BUDGET TIP — highlighted */
.section-tip {
  background: #fefce8;
  border: 1px solid #fde68a;
}
.section-tip .section-label { color: #92400e; }
.section-tip .section-body {
  font-size: 0.88rem;
  color: #78350f;
  line-height: 1.6;
  margin: 0;
}

.error-msg {
  color: #dc2626;
  font-size: 0.85rem;
}
</style>
