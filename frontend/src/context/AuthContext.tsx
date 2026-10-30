import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import axios from 'axios'
import { api, API_BASE_URL } from '../api/client'

export type Rol = 'ADMINISTRADOR' | 'PLANIFICADOR' | 'TECNICO' | 'SOLICITANTE' | 'SOLO_LECTURA'

export type Me = {
  id: number
  username: string
  rol: Rol
  rol_display: string
  tecnico_id: number | null
}

type AuthContextValue = {
  token: string | null
  me: Me | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  puedeGestionar: boolean
  puedeOperar: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('cmms_token'))
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    if (!token) {
      setMe(null)
      return
    }
    api.get<Me>('/accounts/me/').then((res) => setMe(res.data))
  }, [token])

  async function login(username: string, password: string) {
    const { data } = await axios.post(`${API_BASE_URL}/auth/token/`, { username, password })
    localStorage.setItem('cmms_token', data.token)
    setToken(data.token)
  }

  function logout() {
    localStorage.removeItem('cmms_token')
    setToken(null)
    setMe(null)
  }

  const puedeGestionar = me?.rol === 'ADMINISTRADOR' || me?.rol === 'PLANIFICADOR'
  const puedeOperar = puedeGestionar || me?.rol === 'TECNICO'

  return (
    <AuthContext.Provider value={{ token, me, login, logout, puedeGestionar, puedeOperar }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
