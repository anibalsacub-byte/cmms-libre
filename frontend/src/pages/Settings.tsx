import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Paginated, Tecnico, Usuario } from '../types'

function detalleError(err: unknown, fallback: string) {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: Record<string, unknown> } }).response
    const data = response?.data
    if (!data) return fallback
    if (typeof data.detail === 'string') return data.detail
    const primerCampo = Object.values(data)[0]
    if (Array.isArray(primerCampo) && typeof primerCampo[0] === 'string') return primerCampo[0]
    return fallback
  }
  return fallback
}

const ROLES: { value: Usuario['rol']; label: string }[] = [
  { value: 'ADMINISTRADOR', label: 'Administrador' },
  { value: 'PLANIFICADOR', label: 'Planificador / Supervisor' },
  { value: 'TECNICO', label: 'Técnico' },
  { value: 'SOLICITANTE', label: 'Solicitante' },
  { value: 'SOLO_LECTURA', label: 'Solo lectura' },
]

const USUARIO_VACIO = { username: '', password: '', rol: 'TECNICO' as Usuario['rol'], tecnico: '' }

function UsuariosManager() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [editando, setEditando] = useState<number | null>(null)
  const [form, setForm] = useState(USUARIO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function cargarUsuarios() {
    api.get<Paginated<Usuario>>('/accounts/usuarios/').then((res) => setUsuarios(res.data.results))
  }

  useEffect(() => {
    cargarUsuarios()
    api.get<Paginated<Tecnico>>('/hr/tecnicos/').then((res) => setTecnicos(res.data.results))
  }, [])

  function nuevoUsuario() {
    setEditando(0)
    setForm(USUARIO_VACIO)
    setError(null)
  }

  function editarUsuario(u: Usuario) {
    setEditando(u.id)
    setForm({ username: u.username, password: '', rol: u.rol, tecnico: u.tecnico ? String(u.tecnico) : '' })
    setError(null)
  }

  async function guardarUsuario(e: FormEvent) {
    e.preventDefault()
    if (!form.username || (!editando && !form.password)) {
      setError('Usuario y contraseña son obligatorios.')
      return
    }
    setGuardando(true)
    setError(null)
    const payload: Record<string, unknown> = {
      username: form.username,
      rol: form.rol,
      tecnico: form.rol === 'TECNICO' && form.tecnico ? Number(form.tecnico) : null,
    }
    if (form.password) payload.password = form.password
    try {
      if (editando) {
        await api.patch(`/accounts/usuarios/${editando}/`, payload)
      } else {
        await api.post('/accounts/usuarios/', payload)
      }
      setEditando(null)
      cargarUsuarios()
    } catch (err) {
      setError(detalleError(err, 'No se pudo guardar el usuario.'))
    } finally {
      setGuardando(false)
    }
  }

  async function alternarActivo(u: Usuario) {
    if (u.is_active) {
      await api.delete(`/accounts/usuarios/${u.id}/`)
    } else {
      await api.patch(`/accounts/usuarios/${u.id}/`, { is_active: true })
    }
    cargarUsuarios()
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Usuarios de la empresa</h2>
          <p className="text-sm text-slate-500">
            Crea una cuenta para cada técnico, planificador o supervisor: cada quien entra con su
            propio usuario y solo puede hacer lo que su rol permite. Si alguien necesita algo que
            su rol no permite, te lo pide a ti como Administrador.
          </p>
        </div>
        <button
          onClick={nuevoUsuario}
          className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2 whitespace-nowrap"
        >
          Nuevo usuario
        </button>
      </div>

      {editando !== null && (
        <form onSubmit={guardarUsuario} className="bg-slate-50 rounded-md p-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Usuario</label>
              <input
                required
                disabled={!!editando}
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {editando ? 'Nueva contraseña (opcional)' : 'Contraseña'}
              </label>
              <input
                type="password"
                required={!editando}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Rol</label>
              <select
                value={form.rol}
                onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value as Usuario['rol'] }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            {form.rol === 'TECNICO' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Ficha de técnico vinculada
                </label>
                <select
                  value={form.tecnico}
                  onChange={(e) => setForm((f) => ({ ...f, tecnico: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                >
                  <option value="">Sin vincular</option>
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.codigo} - {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={guardando}
              className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setEditando(null)}
              className="text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md px-4 py-2"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Usuario</th>
              <th className="text-left px-4 py-2">Rol</th>
              <th className="text-left px-4 py-2">Técnico vinculado</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-left px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map((u) => (
              <tr key={u.id} className={u.is_active ? '' : 'opacity-50'}>
                <td className="px-4 py-2 font-medium text-slate-700">{u.username}</td>
                <td className="px-4 py-2 text-slate-500">{u.rol_display}</td>
                <td className="px-4 py-2 text-slate-500">{u.tecnico_nombre || '—'}</td>
                <td className="px-4 py-2 text-slate-500">{u.is_active ? 'Activo' : 'Desactivado'}</td>
                <td className="px-4 py-2 text-right space-x-3">
                  <button
                    onClick={() => editarUsuario(u)}
                    className="text-xs font-medium text-slate-600 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => alternarActivo(u)}
                    className={`text-xs font-medium hover:underline ${
                      u.is_active ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {u.is_active ? 'Desactivar' : 'Reactivar'}
                  </button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Todavía no hay usuarios además de tu cuenta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Configuración</h1>
        <p className="text-sm text-slate-500">Acciones administrativas para esta instalación.</p>
      </div>

      <UsuariosManager />

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
