import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cmms_token')
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

type ReportadorDeErrores = (mensaje: string) => void
let reportarError: ReportadorDeErrores | null = null

/** Usado por un único componente global (ver ErrorBanner) para enterarse
 * cuando una llamada a la API termina fallando tras reintentar, en vez de
 * que cada pantalla quede "cargando" para siempre sin avisar nada. */
export function registrarReportadorDeErrores(fn: ReportadorDeErrores | null) {
  reportarError = fn
}

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const MAX_REINTENTOS = 2

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cmms_token')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    const esErrorDeConexion = !error.response || error.response.status >= 500
    const config = error.config
    if (esErrorDeConexion && config && !config.__sinReintentar) {
      const intento = (config.__reintentos || 0) + 1
      config.__reintentos = intento
      if (intento <= MAX_REINTENTOS) {
        await esperar(intento * 2000)
        return api(config)
      }
      reportarError?.(
        'No se pudo conectar con el servidor. Si acaba de estar inactivo, puede tardar unos segundos en responder.',
      )
    }
    return Promise.reject(error)
  },
)
