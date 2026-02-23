import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const email = ref(localStorage.getItem('email') || null)
  const servedBy = ref(null)

  function setAuth(newToken, newEmail) {
    token.value = newToken
    email.value = newEmail
    localStorage.setItem('token', newToken)
    localStorage.setItem('email', newEmail)
  }

  function logout() {
    token.value = null
    email.value = null
    servedBy.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('email')
  }

  return { token, email, servedBy, setAuth, logout }
})
