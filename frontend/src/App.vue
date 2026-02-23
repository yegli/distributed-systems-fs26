<template>
  <router-view />
  <div v-if="auth.servedBy" class="instance-badge">
    {{ auth.servedBy }}
  </div>
</template>

<script setup>
import { useAuthStore } from './stores/auth'
const auth = useAuthStore()
</script>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #f3f4f6;
  color: #111827;
  min-height: 100vh;
}

a { color: inherit; text-decoration: none; }

.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 16px 60px;
}

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.nav h1 { font-size: 1.25rem; font-weight: 700; }

.btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: opacity 0.15s;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn:not(:disabled):hover { opacity: 0.85; }
.btn-primary { background: #2563eb; color: #fff; }
.btn-danger  { background: #dc2626; color: #fff; }
.btn-ghost   { background: transparent; color: #374151; border: 1px solid #d1d5db; }

.card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
  padding: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}
.form-group label { font-size: 0.8rem; font-weight: 600; color: #374151; }
.form-group input,
.form-group select,
.form-group textarea {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  background: #fff;
  color: #111827;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: 2px solid #2563eb;
  outline-offset: -1px;
  border-color: #2563eb;
}

.error-msg {
  color: #dc2626;
  font-size: 0.82rem;
  margin-top: 4px;
}

.instance-badge {
  position: fixed;
  bottom: 0;
  right: 0;
  background: #1f2937;
  color: #9ca3af;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 6px 0 0 0;
  font-family: monospace;
}
</style>
