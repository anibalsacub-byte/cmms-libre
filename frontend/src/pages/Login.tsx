import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError('Usuario o contraseña incorrectos.')
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
        <h1 className="text-xl font-semibold text-slate-800">CMMS Libre</h1>
        <p className="text-sm text-slate-500">Inicia sesión para continuar</p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
          <input
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
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
        <p className="text-xs text-slate-400">
          Instalación nueva: usuario <strong>admin</strong>, contraseña inicial{' '}
          <strong>CambiarAhora123</strong> (te pedirá cambiarla). Si cargaste datos de demo:{' '}
          <strong>admin / admin12345</strong>.
        </p>
        <p className="text-xs text-slate-500 text-center">
          ¿Eres nuevo?{' '}
          <Link to="/registro" className="text-slate-700 underline">
            Crea tu propia empresa
          </Link>
        </p>
      </form>
    </div>
  )
}
