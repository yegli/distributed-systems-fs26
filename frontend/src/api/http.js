import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const http = axios.create({
  baseURL: '/api',
})

// Attach JWT to every request
http.interceptors.request.use(config => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

// Capture X-Served-By header + handle 401 globally
http.interceptors.response.use(
  response => {
    const auth = useAuthStore()
    const served = response.headers['x-served-by']
    if (served) auth.servedBy = served
    return response
  },
  error => {
    if (error.response?.status === 401) {
      const auth = useAuthStore()
      auth.logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default http
