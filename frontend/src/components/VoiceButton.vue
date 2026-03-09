<template>
  <div v-if="supported" class="voice-wrapper">
    <!-- Main mic button -->
    <button
      class="mic-btn"
      :class="{ recording: state === 'recording', processing: state === 'processing', playing: state === 'playing' }"
      :disabled="state === 'processing' || state === 'playing'"
      @click="toggleRecording"
      :title="btnTitle"
    >
      <svg v-if="state === 'idle' || state === 'playing'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
        <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1.5 15.93A7.001 7.001 0 0 1 5 11H3a9 9 0 0 0 8 8.94V22h2v-2.06A9 9 0 0 0 21 11h-2a7 7 0 0 1-5.5 6.93z"/>
      </svg>
      <svg v-else-if="state === 'recording'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
        <rect x="6" y="6" width="12" height="12" rx="2"/>
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
        <circle cx="12" cy="12" r="9" stroke-dasharray="4 2"/>
      </svg>
    </button>

    <span class="mic-label">{{ statusLabel }}</span>

    <!-- Response panel -->
    <div v-if="result" class="voice-result">
      <div class="voice-transcript">
        <span class="voice-tag">You said</span>
        <span>{{ result.transcript }}</span>
      </div>
      <div class="voice-response">
        <span class="voice-tag">Response</span>
        <span>{{ result.responseText }}</span>
      </div>
      <button class="dismiss-btn" @click="result = null">✕</button>
    </div>

    <p v-if="error" class="voice-error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import http from '../api/http'
import { getStoredHomeCurrency } from '../utils/currency.js'

const props = defineProps({
  tripId: { type: [Number, String], required: true },
})

const emit = defineEmits(['expense-added'])

const AC = typeof AudioContext !== 'undefined' ? AudioContext : typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null
const supported = !!AC && !!navigator.mediaDevices?.getUserMedia

const state = ref('idle') // idle | recording | processing | playing
const result = ref(null)
const error = ref('')

let audioCtx = null
let processor = null
let audioStream = null
let pcmChunks = []

const btnTitle = computed(() => ({
  idle: 'Click to start recording',
  recording: 'Click to stop and send',
  processing: 'Processing…',
  playing: 'Playing response',
}[state.value]))

const statusLabel = computed(() => ({
  idle: 'Click to speak',
  recording: 'Click to stop',
  processing: 'Thinking…',
  playing: 'Playing…',
}[state.value]))

function toggleRecording() {
  if (state.value === 'idle') startRecording()
  else if (state.value === 'recording') stopRecording()
}

async function startRecording() {
  error.value = ''
  result.value = null
  pcmChunks = []

  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioCtx = new AC({ sampleRate: 16000 })
    const source = audioCtx.createMediaStreamSource(audioStream)
    processor = audioCtx.createScriptProcessor(4096, 1, 1)
    processor.onaudioprocess = e => pcmChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))
    source.connect(processor)
    processor.connect(audioCtx.destination)
    state.value = 'recording'
  } catch {
    error.value = 'Microphone access denied. Please allow microphone access and try again.'
  }
}

function stopRecording() {
  if (state.value !== 'recording' || !processor) return
  state.value = 'processing'
  processor.disconnect()
  audioCtx.close()
  audioStream.getTracks().forEach(t => t.stop())
  sendAudio(encodeWAV(pcmChunks, 16000))
}

function encodeWAV(chunks, sampleRate) {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const buf = new ArrayBuffer(44 + total * 2)
  const v = new DataView(buf)
  const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, 36 + total * 2, true)
  str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true)
  v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, total * 2, true)
  let off = 44
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++, off += 2) {
      const s = Math.max(-1, Math.min(1, chunk[i]))
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    }
  }
  return new Blob([buf], { type: 'audio/wav' })
}

async function sendAudio(wavBlob) {
  if (!wavBlob || wavBlob.size === 0) { state.value = 'idle'; return }

  const form = new FormData()
  form.append('audio', wavBlob, 'recording.wav')
  form.append('trip_id', String(props.tripId))
  form.append('home_currency', getStoredHomeCurrency())

  try {
    const { data } = await http.post('/voice', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    result.value = { transcript: data.transcript, responseText: data.responseText }
    await speak(data.responseText)
  } catch (err) {
    error.value = err.response?.data?.error || 'Voice command failed. Please try again.'
    state.value = 'idle'
  }
}

function speak(text) {
  return new Promise(resolve => {
    state.value = 'playing'
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'de-CH'
    utter.onend = () => { state.value = 'idle'; resolve() }
    utter.onerror = () => { state.value = 'idle'; resolve() }
    speechSynthesis.speak(utter)
  })
}
</script>

<style scoped>
.voice-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.mic-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.1s;
  flex-shrink: 0;
}
.mic-btn:hover:not(:disabled) { background: #1d4ed8; }
.mic-btn:disabled { cursor: not-allowed; opacity: 0.7; }

.mic-btn.recording {
  background: #dc2626;
  animation: pulse 0.8s ease-in-out infinite;
}
.mic-btn.processing {
  background: #9ca3af;
}
.mic-btn.playing {
  background: #10b981;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5); }
  50%       { transform: scale(1.08); box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
}

.mic-label {
  font-size: 0.72rem;
  color: #6b7280;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.voice-result {
  position: relative;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 12px 36px 12px 12px;
  font-size: 0.82rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 320px;
  width: 100%;
  margin-top: 4px;
}
.voice-transcript,
.voice-response {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.voice-tag {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #16a34a;
}
.dismiss-btn {
  position: absolute;
  top: 8px;
  right: 10px;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  font-size: 0.8rem;
  line-height: 1;
  padding: 0;
}
.dismiss-btn:hover { color: #374151; }

.voice-error {
  font-size: 0.8rem;
  color: #dc2626;
  margin: 0;
  max-width: 300px;
  text-align: center;
}
</style>
