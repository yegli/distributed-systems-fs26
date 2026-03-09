import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const http = axios.create({
  baseURL: '/api',
})

// Attach access token to every request
http.interceptors.request.use(config => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

// Deduplicate concurrent refresh calls
let refreshPromise = null

// Capture X-Served-By header + handle 401 globally
http.interceptors.response.use(
  response => {
    const auth = useAuthStore()
    const served = response.headers['x-served-by']
    if (served) auth.servedBy = served
    return response
  },
  async error => {
    const auth = useAuthStore()
    const original = error.config

    if (error.response?.status === 401 && !original._retried && auth.refreshToken) {
      original._retried = true
      try {
        if (!refreshPromise) {
          refreshPromise = http.post('/auth/refresh', { refreshToken: auth.refreshToken })
            .finally(() => { refreshPromise = null })
        }
        const { data } = await refreshPromise
        auth.setAuth(data.token, data.refreshToken, auth.email)
        original.headers.Authorization = `Bearer ${data.token}`
        return http(original)
      } catch {
        auth.logout()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    if (error.response?.status === 401) {
      auth.logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default http
