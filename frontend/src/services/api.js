import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Injeta token JWT em toda requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hit_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redireciona para login em 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hit_token')
      localStorage.removeItem('hit_user')
      localStorage.removeItem('hit_tenant')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── AUTH ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  metrics: () => api.get('/dashboard/metrics'),
}

// ─── CONVERSAS ────────────────────────────────────────────────────────────────
export const conversationsApi = {
  list: (params) => api.get('/conversations', { params }),
  get: (id) => api.get(`/conversations/${id}`),
  send: (id, message) => api.post(`/conversations/${id}/send`, { message }),
  returnToAI: (id) => api.patch(`/conversations/${id}/return-to-ai`),
  close: (id) => api.patch(`/conversations/${id}/close`),
}

// ─── BASE DE CONHECIMENTO ─────────────────────────────────────────────────────
export const knowledgeApi = {
  list: () => api.get('/knowledge'),
  create: (data) => api.post('/knowledge', data),
  update: (id, data) => api.put(`/knowledge/${id}`, data),
  delete: (id) => api.delete(`/knowledge/${id}`),
  upload: (formData) => api.post('/knowledge/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}

// ─── TEMPLATES ────────────────────────────────────────────────────────────────
export const templatesApi = {
  list: () => api.get('/templates'),
  create: (data) => api.post('/templates', data),
  submit: (id) => api.post(`/templates/${id}/submit`),
  delete: (id) => api.delete(`/templates/${id}`),
}

// ─── ELEITORES ────────────────────────────────────────────────────────────────
export const votersApi = {
  list: (params) => api.get('/voters', { params }),
  get: (id) => api.get(`/voters/${id}`),
  update: (id, data) => api.patch(`/voters/${id}`, data),
  exportCsv: () => api.get('/voters/export/csv', { responseType: 'blob' }),
}

// ─── AGENDAMENTOS ─────────────────────────────────────────────────────────────
export const schedulerApi = {
  list: (params) => api.get('/scheduler', { params }),
  create: (data) => api.post('/scheduler', data),
  bulk: (data) => api.post('/scheduler/bulk', data),
  cancel: (id) => api.delete(`/scheduler/${id}`),
}

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get('/settings'),
  updatePersona: (data) => api.patch('/settings/persona', data),
  updateApiKeys: (data) => api.patch('/settings/api-keys', data),
  getUsers: () => api.get('/settings/users'),
  createUser: (data) => api.post('/settings/users', data),
  changePassword: (data) => api.patch('/settings/password', data),
}

export default api
