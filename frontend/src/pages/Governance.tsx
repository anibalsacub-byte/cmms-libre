import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { InformeCalidadDatos, MatrizPermisos, Paginated, RegistroAuditoria } from '../types'

function detalleError(err: unknown, fallback: string) {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const data = (err as { response?: { data?: Record<string, unknown> } }).response?.data
    if (!data) return fallback
    if (typeof data.detail === 'string') return data.detail
    return fallback
  }
  return fallback
}

const TABS = [
  { key: 'calidad', label: 'Calidad de datos' },
  { key: 'auditoria', label: 'Auditoría' },
  { key: 'permisos', label: 'Permisos' },
] as const
type TabKey = (typeof TABS)[number]['key']

function Lista({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">
        {titulo} ({items.length})
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-emerald-600">Sin problemas.</p>
      ) : (
        <p className="text-sm text-slate-700">{items.join(', ')}</p>
      )}
    </div>
  )
}

function CalidadDatos() {
  const [informe, setInforme] = useState<InformeCalidadDatos | null>(null)
  const [patron, setPatron] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function cargar() {
    api.get<InformeCalidadDatos>('/companies/calidad-datos/').then((res) => {
      setInforme(res.data)
      setPatron(res.data.patron_codigo)
    })
  }

  useEffect(cargar, [])

  async function guardarPatron() {
    setGuardando(true)
    setError(null)
    try {
      await api.patch('/accounts/configuracion-empresa/', { patron_codigo: patron })
      cargar()
    } catch (err) {
      setError(detalleError(err, 'No se pudo guardar el patrón.'))
    } finally {
      setGuardando(false)
    }
  }

  if (!informe) return <p className="text-sm text-slate-500">Cargando informe...</p>

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Regla de formato de código</h2>
        <p className="text-sm text-slate-500">
          Expresión regular opcional que deben cumplir los códigos de activos, materiales,
          técnicos, clases de activo y ubicaciones técnicas. Déjala vacía para no exigir ningún
          formato. Ej.: <code className="bg-slate-100 px-1 rounded">^[A-Z]{'{2,4}'}-\d{'{3,6}'}$</code>
        </p>
        <div className="flex gap-2 max-w-lg">
          <input
            value={patron}
            onChange={(e) => setPatron(e.target.value)}
            placeholder="Ej. ^[A-Z]{2,4}-\d{3,6}$"
            className="flex-1 rounded-md border border-slate-300 text-sm px-2 py-1.5 font-mono"
          />
          <button
            onClick={guardarPatron}
            disabled={guardando}
            className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-1.5 disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Duplicados por nombre</h2>
        <p className="text-xs text-slate-500">
          Activos o materiales con el mismo nombre/descripción pero código distinto: suele
          indicar un alta duplicada.
        </p>
        {informe.duplicados_por_nombre.activos.length === 0 &&
        informe.duplicados_por_nombre.materiales.length === 0 ? (
          <p className="text-sm text-emerald-600">Sin duplicados detectados.</p>
        ) : (
          <ul className="text-sm text-slate-700 space-y-1">
            {informe.duplicados_por_nombre.activos.map((d) => (
              <li key={`a-${d.nombre}`}>
                Activo «{d.nombre}»: {d.codigos.join(', ')}
              </li>
            ))}
            {informe.duplicados_por_nombre.materiales.map((d) => (
              <li key={`m-${d.nombre}`}>
                Material «{d.nombre}»: {d.codigos.join(', ')}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Campos obligatorios vacíos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Lista
            titulo="Materiales sin costo"
            items={informe.campos_obligatorios_vacios.materiales_sin_costo}
          />
          <Lista
            titulo="Activos sin ficha técnica (fabricante/modelo/serie)"
            items={informe.campos_obligatorios_vacios.activos_sin_ficha_tecnica}
          />
          <Lista
            titulo="Técnicos sin tarifa por hora"
            items={informe.campos_obligatorios_vacios.tecnicos_sin_tarifa}
          />
          <Lista
            titulo="Activos sin ubicación"
            items={informe.campos_obligatorios_vacios.activos_sin_ubicacion}
          />
          <Lista titulo="OT sin activo" items={informe.campos_obligatorios_vacios.ot_sin_activo} />
        </div>
      </div>

      {informe.patron_codigo && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Códigos que no cumplen el formato ({informe.patron_codigo})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Lista titulo="Activos" items={informe.codigos_formato_invalido.activos} />
            <Lista titulo="Materiales" items={informe.codigos_formato_invalido.materiales} />
            <Lista titulo="Técnicos" items={informe.codigos_formato_invalido.tecnicos} />
            <Lista titulo="Clases de activo" items={informe.codigos_formato_invalido.clases_activo} />
            <Lista
              titulo="Ubicaciones técnicas"
              items={informe.codigos_formato_invalido.ubicaciones_tecnicas}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Auditoria() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [accion, setAccion] = useState('')
  const [busqueda, setBusqueda] = useState('')

  function cargar() {
    const params = new URLSearchParams()
    if (accion) params.set('accion', accion)
    if (busqueda) params.set('search', busqueda)
    api
      .get<Paginated<RegistroAuditoria>>(`/companies/auditoria/?${params.toString()}`)
      .then((res) => setRegistros(res.data.results))
  }

  useEffect(cargar, [accion, busqueda])

  async function exportarCsv() {
    const res = await api.get('/companies/auditoria/exportar-csv/', { responseType: 'blob' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(new Blob([res.data]))
    link.download = 'auditoria.csv'
    link.click()
    window.URL.revokeObjectURL(link.href)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          placeholder="Buscar por usuario u objeto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="rounded-md border border-slate-300 text-sm px-3 py-1.5 flex-1 min-w-[200px]"
        />
        <select
          value={accion}
          onChange={(e) => setAccion(e.target.value)}
          className="rounded-md border border-slate-300 text-sm px-3 py-1.5 bg-white"
        >
          <option value="">Todas las acciones</option>
          <option value="CREAR">Crear</option>
          <option value="EDITAR">Editar</option>
          <option value="ELIMINAR">Eliminar</option>
        </select>
        <button
          onClick={exportarCsv}
          className="text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md px-4 py-1.5"
        >
          Exportar CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Fecha</th>
              <th className="text-left px-4 py-2">Usuario</th>
              <th className="text-left px-4 py-2">Acción</th>
              <th className="text-left px-4 py-2">Módulo</th>
              <th className="text-left px-4 py-2">Objeto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registros.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                  {new Date(r.fecha).toLocaleString()}
                </td>
                <td className="px-4 py-2">{r.usuario || '—'}</td>
                <td className="px-4 py-2">{r.accion}</td>
                <td className="px-4 py-2 text-slate-500">{r.modelo}</td>
                <td className="px-4 py-2">{r.objeto_str}</td>
              </tr>
            ))}
            {registros.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Sin registros todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Permisos() {
  const [matriz, setMatriz] = useState<MatrizPermisos | null>(null)

  useEffect(() => {
    api.get<MatrizPermisos>('/accounts/matriz-permisos/').then((res) => setMatriz(res.data))
  }, [])

  if (!matriz) return <p className="text-sm text-slate-500">Cargando...</p>

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Roles: {matriz.roles.join(', ')}.
      </p>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Módulo</th>
              <th className="text-left px-4 py-2">Lectura</th>
              <th className="text-left px-4 py-2">Escribir/editar</th>
              <th className="text-left px-4 py-2">Eliminar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {matriz.modulos.map((m) => (
              <tr key={m.modulo}>
                <td className="px-4 py-2 font-medium text-slate-700">{m.modulo}</td>
                <td className="px-4 py-2 text-slate-600">{m.lectura}</td>
                <td className="px-4 py-2 text-slate-600">{m.escribir}</td>
                <td className="px-4 py-2 text-slate-600">{m.eliminar}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Governance() {
  const [tab, setTab] = useState<TabKey>('calidad')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Calidad, permisos y auditoría</h1>
        <p className="text-sm text-slate-500">
          Herramientas para mantener los datos limpios y entender quién puede hacer qué.
        </p>
      </div>

      <div className="flex border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key
                ? 'border-slate-800 text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'calidad' && <CalidadDatos />}
      {tab === 'auditoria' && <Auditoria />}
      {tab === 'permisos' && <Permisos />}
    </div>
  )
}
