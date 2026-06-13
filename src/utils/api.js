import axios from 'axios'

const api = axios.create({
  baseURL: 'https://project-wbs-backend.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const stored = JSON.parse(localStorage.getItem('wbs-store') || '{}')
  const token = stored?.state?.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('wbs-store')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
