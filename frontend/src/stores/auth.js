import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const refreshToken = ref(localStorage.getItem('refreshToken') || null)
  const email = ref(localStorage.getItem('email') || null)
  const servedBy = ref(null)

  function setAuth(newToken, newRefreshToken, newEmail) {
    token.value = newToken
    refreshToken.value = newRefreshToken
    email.value = newEmail
    localStorage.setItem('token', newToken)
    localStorage.setItem('refreshToken', newRefreshToken)
    localStorage.setItem('email', newEmail)
  }

  function logout() {
    token.value = null
    refreshToken.value = null
    email.value = null
    servedBy.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('email')
  }

  return { token, refreshToken, email, servedBy, setAuth, logout }
})
