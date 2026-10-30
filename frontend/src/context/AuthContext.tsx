import { createContext, useContext, useState, type ReactNode } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../api/client'

type AuthContextValue = {
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('cmms_token'))

  async function login(username: string, password: string) {
    const { data } = await axios.post(`${API_BASE_URL}/auth/token/`, { username, password })
    localStorage.setItem('cmms_token', data.token)
    setToken(data.token)
  }

  function logout() {
    localStorage.removeItem('cmms_token')
    setToken(null)
  }

  return <AuthContext.Provider value={{ token, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
