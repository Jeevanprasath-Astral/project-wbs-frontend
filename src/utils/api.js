import axios from 'axios'

// Local dev (vite dev, via START_PROJECT_WBS.bat) proxies /api -> http://localhost:8000
// (see vite.config.js). Production builds fall back to the deployed Render backend
// unless VITE_API_URL is explicitly set.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    || (import.meta.env.DEV ? '/api' : 'https://project-wbs-backend.onrender.com/api'),
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
