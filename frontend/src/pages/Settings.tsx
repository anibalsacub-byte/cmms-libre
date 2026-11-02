import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

function detalleError(err: unknown, fallback: string) {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { detail?: string } } }).response
    return response?.data?.detail ?? fallback
  }
  return fallback
}

export default function Settings() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [cargandoDemo, setCargandoDemo] = useState(false)
  const [mensajeDemo, setMensajeDemo] = useState<string | null>(null)
  const [errorDemo, setErrorDemo] = useState<string | null>(null)

  const [confirmacion, setConfirmacion] = useState('')
  const [reiniciando, setReiniciando] = useState(false)
  const [errorReinicio, setErrorReinicio] = useState<string | null>(null)

  async function cargarDemo() {
    setCargandoDemo(true)
    setErrorDemo(null)
    setMensajeDemo(null)
    try {
      await api.post('/accounts/cargar-demo/', {})
      setMensajeDemo('Datos de demostración cargados. Recargando...')
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      setErrorDemo(detalleError(err, 'No se pudo cargar la demo.'))
    } finally {
      setCargandoDemo(false)
    }
  }

  async function reiniciarInstalacion() {
    setReiniciando(true)
    setErrorReinicio(null)
    try {
      await api.post('/accounts/reiniciar-instalacion/', { confirmar: confirmacion })
      logout()
      navigate('/login')
    } catch (err) {
      setErrorReinicio(detalleError(err, 'No se pudo restablecer la instalación.'))
    } finally {
      setReiniciando(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Configuración</h1>
        <p className="text-sm text-slate-500">Acciones administrativas para esta instalación.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Datos de demostración</h2>
        <p className="text-sm text-slate-500">
          Carga una empresa de ejemplo (activos, avisos, OT, inventario, planes preventivos) con
          varios usuarios de muestra. Solo funciona si la instalación todavía está vacía.
        </p>
        {errorDemo && <p className="text-sm text-red-600">{errorDemo}</p>}
        {mensajeDemo && <p className="text-sm text-emerald-600">{mensajeDemo}</p>}
        <button
          onClick={cargarDemo}
          disabled={cargandoDemo}
          className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2 disabled:opacity-50"
        >
          {cargandoDemo ? 'Cargando...' : 'Cargar datos de demostración'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-red-700">Zona de peligro</h2>
        <p className="text-sm text-slate-500">
          Borra <strong>todo</strong>: activos, avisos, órdenes de trabajo, inventario, usuarios —
          deja la instalación como recién instalada, con un único usuario <code>admin</code> que
          deberá cambiar su contraseña al entrar. Esta acción no se puede deshacer.
        </p>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Escribe <strong>BORRAR</strong> para confirmar
          </label>
          <input
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {errorReinicio && <p className="text-sm text-red-600">{errorReinicio}</p>}
        <button
          onClick={reiniciarInstalacion}
          disabled={reiniciando || confirmacion !== 'BORRAR'}
          className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {reiniciando ? 'Restableciendo...' : 'Restablecer instalación'}
        </button>
      </div>
    </div>
  )
}
