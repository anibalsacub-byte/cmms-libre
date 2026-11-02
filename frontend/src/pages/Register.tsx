import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { registrarEmpresa } = useAuth()
  const navigate = useNavigate()
  const [nombreEmpresa, setNombreEmpresa] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await registrarEmpresa(nombreEmpresa, username, password)
      navigate('/')
    } catch (err: any) {
      const detalle =
        err?.response?.data?.detail ||
        err?.response?.data?.username?.[0] ||
        err?.response?.data?.nombre_empresa?.[0] ||
        err?.response?.data?.password?.[0] ||
        'No se pudo crear la empresa. Revisa los datos.'
      setError(detalle)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-lg p-8 w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-semibold text-slate-800">Crear mi empresa</h1>
        <p className="text-sm text-slate-500">
          Cada empresa tiene sus propios datos, completamente separados de los demás (ideal para
          que cada alumno o grupo trabaje con su propia información).
        </p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nombre de la empresa / grupo
          </label>
          <input
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={nombreEmpresa}
            onChange={(e) => setNombreEmpresa(e.target.value)}
            placeholder="Ej. Grupo 3 - Planta Norte"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Usuario administrador
          </label>
          <input
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
          <input
            required
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-800 text-white py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-60"
        >
          {loading ? 'Creando...' : 'Crear empresa e ingresar'}
        </button>
        <p className="text-xs text-slate-400">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="text-slate-600 underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  )
}
