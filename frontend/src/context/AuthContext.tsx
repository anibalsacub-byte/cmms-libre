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
  debe_cambiar_password: boolean
  empresa_id: number | null
  empresa_nombre: string | null
}

type AuthContextValue = {
  token: string | null
  me: Me | null
  login: (username: string, password: string) => Promise<void>
  registrarEmpresa: (nombreEmpresa: string, username: string, password: string) => Promise<void>
  logout: () => void
  refrescarMe: () => Promise<void>
  puedeGestionar: boolean
  puedeOperar: boolean
  esAdministrador: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('cmms_token'))
  const [me, setMe] = useState<Me | null>(null)

  async function refrescarMe() {
    const { data } = await api.get<Me>('/accounts/me/')
    setMe(data)
  }

  useEffect(() => {
    if (!token) {
      setMe(null)
      return
    }
    refrescarMe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function login(username: string, password: string) {
    const { data } = await axios.post(`${API_BASE_URL}/auth/token/`, { username, password })
    localStorage.setItem('cmms_token', data.token)
    setToken(data.token)
  }

  async function registrarEmpresa(nombreEmpresa: string, username: string, password: string) {
    const { data } = await axios.post(`${API_BASE_URL}/accounts/registrar-empresa/`, {
      nombre_empresa: nombreEmpresa,
      username,
      password,
    })
    localStorage.setItem('cmms_token', data.token)
    setMe(data.me)
    setToken(data.token)
  }

  function logout() {
    localStorage.removeItem('cmms_token')
    setToken(null)
    setMe(null)
  }

  const puedeGestionar = me?.rol === 'ADMINISTRADOR' || me?.rol === 'PLANIFICADOR'
  const puedeOperar = puedeGestionar || me?.rol === 'TECNICO'
  const esAdministrador = me?.rol === 'ADMINISTRADOR'

  return (
    <AuthContext.Provider
      value={{
        token,
        me,
        login,
        registrarEmpresa,
        logout,
        refrescarMe,
        puedeGestionar,
        puedeOperar,
        esAdministrador,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
