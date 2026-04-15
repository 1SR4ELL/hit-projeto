import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hit_user')) } catch { return null }
  })
  const [tenant, setTenant] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hit_tenant')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  // Valida token ao carregar
  useEffect(() => {
    const token = localStorage.getItem('hit_token')
    if (!token) { setLoading(false); return }

    authApi.me()
      .then(({ data }) => {
        setUser(data.user)
        setTenant(data.tenant)
        connectSocket(data.tenant.id)
      })
      .catch(() => {
        localStorage.removeItem('hit_token')
        localStorage.removeItem('hit_user')
        localStorage.removeItem('hit_tenant')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password)
    localStorage.setItem('hit_token', data.token)
    localStorage.setItem('hit_user', JSON.stringify(data.user))
    localStorage.setItem('hit_tenant', JSON.stringify(data.tenant))
    setUser(data.user)
    setTenant(data.tenant)
    connectSocket(data.tenant.id)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('hit_token')
    localStorage.removeItem('hit_user')
    localStorage.removeItem('hit_tenant')
    setUser(null)
    setTenant(null)
    disconnectSocket()
    window.location.href = '/login'
  }, [])

  const refreshTenant = useCallback(async () => {
    const { data } = await authApi.me()
    setTenant(data.tenant)
    localStorage.setItem('hit_tenant', JSON.stringify(data.tenant))
  }, [])

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, logout, refreshTenant }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
