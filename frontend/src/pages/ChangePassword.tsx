import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function ChangePassword() {
  const { me, refrescarMe, logout } = useAuth()
  const navigate = useNavigate()
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const esObligatorio = me?.debe_cambiar_password ?? false

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (passwordNueva !== confirmar) {
      setError('La nueva contraseña no coincide con la confirmación.')
      return
    }
    if (passwordNueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }

    setEnviando(true)
    try {
      await api.post('/accounts/cambiar-password/', {
        password_actual: passwordActual,
        password_nueva: passwordNueva,
      })
      await refrescarMe()
      navigate('/')
    } catch (err) {
      const mensaje =
        (axiosErrorDetail(err) as string | undefined) ??
        'No se pudo cambiar la contraseña. Intenta de nuevo.'
      setError(mensaje)
    } finally {
      setEnviando(false)
    }
  }

  function axiosErrorDetail(err: unknown) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const response = (err as { response?: { data?: { detail?: string } } }).response
      return response?.data?.detail
    }
    return undefined
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-lg p-8 w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-semibold text-slate-800">Cambiar contraseña</h1>
        {esObligatorio ? (
          <p className="text-sm text-amber-600">
            Por seguridad, debes cambiar la contraseña inicial antes de continuar.
          </p>
        ) : (
          <p className="text-sm text-slate-500">Actualiza tu contraseña de acceso.</p>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Contraseña actual
          </label>
          <input
            type="password"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nueva contraseña
          </label>
          <input
            type="password"
            required
            minLength={8}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Confirmar nueva contraseña
          </label>
          <input
            type="password"
            required
            minLength={8}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-md bg-slate-800 text-white py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-60"
        >
          {enviando ? 'Guardando...' : 'Cambiar contraseña'}
        </button>

        {esObligatorio && (
          <button
            type="button"
            onClick={logout}
            className="w-full text-xs text-slate-400 hover:text-slate-600"
          >
            Cerrar sesión
          </button>
        )}
      </form>
    </div>
  )
}
