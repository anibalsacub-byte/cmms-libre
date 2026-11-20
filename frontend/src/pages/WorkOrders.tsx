import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import type {
  Adjunto,
  CausaFalla,
  Material,
  MecanismoFalla,
  ModoFalla,
  OrdenTrabajo,
  OrdenTrabajoDetalle,
  Paginated,
  Sintoma,
  Tecnico,
} from '../types'
import Badge from '../components/Badge'
import { useAuth } from '../context/AuthContext'

const ESTADOS = [
  'CREADA',
  'PLANIFICADA',
  'ASIGNADA',
  'EN_PROGRESO',
  'PENDIENTE_MATERIAL',
  'PENDIENTE_APROBACION',
  'CERRADA',
  'CANCELADA',
]

const TABS = [
  { key: 'general', label: 'Datos generales' },
  { key: 'componentes', label: 'Componentes' },
  { key: 'tecnicos', label: 'Técnicos' },
  { key: 'costos', label: 'Costos' },
  { key: 'adjuntos', label: 'Adjuntos' },
  { key: 'bitacora', label: 'Bitácora' },
] as const
type TabKey = (typeof TABS)[number]['key']

function detalleError(err: unknown, fallback: string) {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
    if (typeof detail === 'string') return detail
  }
  return fallback
}

export default function WorkOrders() {
  const { puedeOperar } = useAuth()
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([])
  const [seleccionada, setSeleccionada] = useState<OrdenTrabajoDetalle | null>(null)
  const [tab, setTab] = useState<TabKey>('general')
  const [cambiando, setCambiando] = useState(false)
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const otAbierta = seleccionada ? !['CERRADA', 'CANCELADA'].includes(seleccionada.estado) : false

  const [formHoras, setFormHoras] = useState({ tecnico: '', fecha: '', horas_reales: '' })
  const [formMaterial, setFormMaterial] = useState({ material: '', cantidad: '', fuente: 'STOCK_LOCAL' })

  const [mostrarCierre, setMostrarCierre] = useState(false)
  const [cierre, setCierre] = useState({
    trabajo_realizado: '',
    tiempo_parada_horas: '',
    sintoma: '',
    modo_falla: '',
    mecanismo_falla: '',
    causa_falla: '',
  })
  const [errorCierre, setErrorCierre] = useState<string | null>(null)

  const [sintomas, setSintomas] = useState<Sintoma[]>([])
  const [modos, setModos] = useState<ModoFalla[]>([])
  const [mecanismos, setMecanismos] = useState<MecanismoFalla[]>([])
  const [causas, setCausas] = useState<CausaFalla[]>([])

  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const filaSeleccionadaRef = useRef<HTMLTableRowElement>(null)
  const detalleRef = useRef<HTMLDivElement>(null)

  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((o) => {
      if (filtroEstado && o.estado !== filtroEstado) return false
      if (filtroPrioridad && o.prioridad !== filtroPrioridad) return false
      if (filtroTexto) {
        const q = filtroTexto.toLowerCase()
        const enTexto =
          o.numero.toLowerCase().includes(q) ||
          o.activo_codigo.toLowerCase().includes(q) ||
          o.descripcion.toLowerCase().includes(q)
        if (!enTexto) return false
      }
      return true
    })
  }, [ordenes, filtroTexto, filtroEstado, filtroPrioridad])

  function load() {
    api.get<Paginated<OrdenTrabajo>>('/workorders/ordenes/').then((res) => setOrdenes(res.data.results))
  }

  useEffect(load, [])
  useEffect(() => {
    api.get<Paginated<Tecnico>>('/hr/tecnicos/').then((res) => setTecnicos(res.data.results))
    api.get<Paginated<Material>>('/inventory/materiales/').then((res) => setMateriales(res.data.results))
    api.get<Paginated<Sintoma>>('/failures/sintomas/').then((res) => setSintomas(res.data.results))
    api.get<Paginated<ModoFalla>>('/failures/modos-falla/').then((res) => setModos(res.data.results))
    api
      .get<Paginated<MecanismoFalla>>('/failures/mecanismos-falla/')
      .then((res) => setMecanismos(res.data.results))
    api.get<Paginated<CausaFalla>>('/failures/causas-falla/').then((res) => setCausas(res.data.results))
  }, [])

  function cargarAdjuntos(otId: number) {
    api
      .get<Paginated<Adjunto>>(`/attachments/adjuntos/?orden_trabajo=${otId}`)
      .then((res) => setAdjuntos(res.data.results))
  }

  async function abrir(id: number) {
    const { data } = await api.get<OrdenTrabajoDetalle>(`/workorders/ordenes/${id}/`)
    setSeleccionada(data)
    cargarAdjuntos(id)
    setMostrarCierre(false)
    setTab('general')
    setTimeout(() => detalleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  async function recargarSeleccionada() {
    if (!seleccionada) return
    const { data } = await api.get<OrdenTrabajoDetalle>(`/workorders/ordenes/${seleccionada.id}/`)
    setSeleccionada(data)
  }

  async function cambiarEstado(estado: string) {
    if (!seleccionada) return
    if (estado === 'CERRADA') {
      setCierre({
        trabajo_realizado: seleccionada.trabajo_realizado || '',
        tiempo_parada_horas: '',
        sintoma: seleccionada.sintoma ? String(seleccionada.sintoma) : '',
        modo_falla: seleccionada.modo_falla ? String(seleccionada.modo_falla) : '',
        mecanismo_falla: seleccionada.mecanismo_falla ? String(seleccionada.mecanismo_falla) : '',
        causa_falla: seleccionada.causa_falla ? String(seleccionada.causa_falla) : '',
      })
      setErrorCierre(null)
      setMostrarCierre(true)
      return
    }
    setCambiando(true)
    try {
      const { data } = await api.post<OrdenTrabajoDetalle>(
        `/workorders/ordenes/${seleccionada.id}/cambiar-estado/`,
        { estado },
      )
      setSeleccionada(data)
      load()
    } finally {
      setCambiando(false)
    }
  }

  async function confirmarCierre() {
    if (!seleccionada) return
    setCambiando(true)
    setErrorCierre(null)
    try {
      const { data } = await api.post<OrdenTrabajoDetalle>(`/workorders/ordenes/${seleccionada.id}/cerrar/`, {
        trabajo_realizado: cierre.trabajo_realizado,
        tiempo_parada_horas: cierre.tiempo_parada_horas || 0,
        sintoma: cierre.sintoma ? Number(cierre.sintoma) : null,
        modo_falla: cierre.modo_falla ? Number(cierre.modo_falla) : null,
        mecanismo_falla: cierre.mecanismo_falla ? Number(cierre.mecanismo_falla) : null,
        causa_falla: cierre.causa_falla ? Number(cierre.causa_falla) : null,
      })
      setSeleccionada(data)
      setMostrarCierre(false)
      load()
    } catch (err) {
      setErrorCierre(detalleError(err, 'No se pudo cerrar la OT.'))
    } finally {
      setCambiando(false)
    }
  }

  async function registrarHoras(e: React.FormEvent) {
    e.preventDefault()
    if (!seleccionada || !formHoras.tecnico || !formHoras.fecha || !formHoras.horas_reales) return
    try {
      await api.post('/workorders/asignaciones/', {
        orden_trabajo: seleccionada.id,
        tecnico: Number(formHoras.tecnico),
        fecha: formHoras.fecha,
        horas_planificadas: formHoras.horas_reales,
        horas_reales: formHoras.horas_reales,
      })
      setFormHoras({ tecnico: '', fecha: '', horas_reales: '' })
      recargarSeleccionada()
    } catch (err) {
      window.alert(detalleError(err, 'No se pudieron registrar las horas.'))
    }
  }

  async function quitarHoras(asignacionId: number) {
    await api.delete(`/workorders/asignaciones/${asignacionId}/`)
    recargarSeleccionada()
  }

  async function registrarMaterial(e: React.FormEvent) {
    e.preventDefault()
    if (!seleccionada || !formMaterial.material || !formMaterial.cantidad) return
    const mat = materiales.find((m) => m.id === Number(formMaterial.material))
    if (!mat) return
    try {
      await api.post('/workorders/materiales-utilizados/', {
        orden_trabajo: seleccionada.id,
        material: mat.id,
        cantidad: formMaterial.cantidad,
        costo_unitario: mat.costo_unitario,
        fuente: formMaterial.fuente,
      })
      setFormMaterial({ material: '', cantidad: '', fuente: 'STOCK_LOCAL' })
      recargarSeleccionada()
    } catch (err) {
      window.alert(detalleError(err, 'No se pudo registrar el material.'))
    }
  }

  async function quitarMaterial(materialUtilizadoId: number) {
    await api.delete(`/workorders/materiales-utilizados/${materialUtilizadoId}/`)
    recargarSeleccionada()
  }

  async function subirAdjunto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo || !seleccionada) return
    setSubiendo(true)
    try {
      const formData = new FormData()
      formData.append('archivo', archivo)
      formData.append('orden_trabajo', String(seleccionada.id))
      await api.post('/attachments/adjuntos/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      cargarAdjuntos(seleccionada.id)
    } finally {
      setSubiendo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Órdenes de trabajo</h1>
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Número / Activo / Descripción
              </label>
              <input
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Ej. OT-000012, BMB-001, fuga..."
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              >
                <option value="">Todos</option>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Prioridad</label>
              <select
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value)}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              >
                <option value="">Todas</option>
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Orden</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Activo</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Texto breve</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Tipo</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Prioridad</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Status</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Fecha</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-right">Costo</th>
                </tr>
              </thead>
              <tbody>
                {ordenesFiltradas.map((o) => (
                  <tr
                    key={o.id}
                    ref={seleccionada?.id === o.id ? filaSeleccionadaRef : undefined}
                    onClick={() => abrir(o.id)}
                    className={`cursor-pointer hover:bg-slate-50 ${
                      seleccionada?.id === o.id ? 'bg-slate-100' : ''
                    }`}
                  >
                    <td className="border border-slate-300 px-2 py-1.5 font-medium text-slate-700 whitespace-nowrap">
                      {o.numero}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 whitespace-nowrap">
                      {o.activo_codigo}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 max-w-xs truncate">
                      {o.descripcion}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-slate-500 whitespace-nowrap">
                      {o.tipo}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5">
                      <Badge value={o.prioridad} />
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-slate-500 whitespace-nowrap">
                      {o.estado}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-slate-500 whitespace-nowrap">
                      {new Date(o.fecha_creacion).toLocaleDateString()}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-500 whitespace-nowrap">
                      S/ {o.costo_total}
                    </td>
                  </tr>
                ))}
                {ordenesFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="border border-slate-300 px-2 py-4 text-center text-slate-500">
                      Sin órdenes para estos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div ref={detalleRef} className="bg-white rounded-lg shadow-sm border border-slate-200 scroll-mt-4">
          {!seleccionada ? (
            <p className="text-sm text-slate-500 p-4">Selecciona una OT para ver su detalle.</p>
          ) : (
            <div>
              {/* Cabecera */}
              <div className="p-4 border-b border-slate-200 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-slate-800">{seleccionada.numero}</h2>
                    <p className="text-xs text-slate-500">
                      {seleccionada.activo_codigo} - {seleccionada.activo_nombre}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge value={seleccionada.prioridad} />
                    <span className="text-xs text-slate-500">{seleccionada.tipo}</span>
                  </div>
                </div>

                <div className="max-w-xs">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
                  <select
                    value={seleccionada.estado}
                    disabled={cambiando || !puedeOperar}
                    onChange={(e) => cambiarEstado(e.target.value)}
                    className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>

                {mostrarCierre && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-2">
                    <p className="text-xs font-medium text-amber-700">Cerrando la OT</p>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Trabajo realizado
                      </label>
                      <textarea
                        value={cierre.trabajo_realizado}
                        onChange={(e) => setCierre((f) => ({ ...f, trabajo_realizado: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Tiempo de parada (horas)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={cierre.tiempo_parada_horas}
                        onChange={(e) =>
                          setCierre((f) => ({ ...f, tiempo_parada_horas: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>

                    {seleccionada.tipo === 'CORRECTIVO' && (
                      <div>
                        <p className="text-xs font-medium text-amber-700 mb-2">
                          Clasificación de falla (ISO 14224) — modo, mecanismo y causa son
                          obligatorios para cerrar un correctivo, salvo que Configuración lo haga
                          opcional.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              Síntoma
                            </label>
                            <select
                              value={cierre.sintoma}
                              onChange={(e) => setCierre((f) => ({ ...f, sintoma: e.target.value }))}
                              className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                            >
                              <option value="">Sin especificar</option>
                              {sintomas.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              Modo de falla
                            </label>
                            <select
                              value={cierre.modo_falla}
                              onChange={(e) =>
                                setCierre((f) => ({ ...f, modo_falla: e.target.value }))
                              }
                              className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                            >
                              <option value="">Sin especificar</option>
                              {modos.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.codigo} - {m.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              Mecanismo
                            </label>
                            <select
                              value={cierre.mecanismo_falla}
                              onChange={(e) =>
                                setCierre((f) => ({ ...f, mecanismo_falla: e.target.value }))
                              }
                              className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                            >
                              <option value="">Sin especificar</option>
                              {mecanismos.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.codigo} - {m.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              Causa
                            </label>
                            <select
                              value={cierre.causa_falla}
                              onChange={(e) =>
                                setCierre((f) => ({ ...f, causa_falla: e.target.value }))
                              }
                              className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                            >
                              <option value="">Sin especificar</option>
                              {causas.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.codigo} - {c.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {errorCierre && <p className="text-xs text-red-600">{errorCierre}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={confirmarCierre}
                        disabled={cambiando}
                        className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-3 py-1.5 disabled:opacity-50"
                      >
                        Confirmar cierre
                      </button>
                      <button
                        onClick={() => setMostrarCierre(false)}
                        className="text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md px-3 py-1.5"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pestañas */}
              <div className="flex border-b border-slate-200 overflow-x-auto">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px ${
                      tab === t.key
                        ? 'border-slate-800 text-slate-800'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {tab === 'general' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Descripción</h3>
                      <p className="text-sm text-slate-600">{seleccionada.descripcion}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Tareas</h3>
                      <ul className="text-sm space-y-1">
                        {seleccionada.tareas.map((t) => (
                          <li key={t.id} className="flex items-center gap-2">
                            <span>{t.completada ? '✅' : '⬜'}</span>
                            {t.descripcion}
                          </li>
                        ))}
                        {seleccionada.tareas.length === 0 && (
                          <li className="text-slate-500">Sin tareas registradas.</li>
                        )}
                      </ul>
                    </div>
                    {seleccionada.trabajo_realizado && (
                      <div>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">
                          Trabajo realizado
                        </h3>
                        <p className="text-sm text-slate-600">{seleccionada.trabajo_realizado}</p>
                      </div>
                    )}
                    {(seleccionada.modo_falla || seleccionada.mecanismo_falla || seleccionada.causa_falla) && (
                      <div>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">
                          Clasificación de falla (ISO 14224)
                        </h3>
                        <dl className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <dt className="text-xs text-slate-500">Síntoma</dt>
                            <dd className="text-slate-700">{seleccionada.sintoma_nombre || '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-500">Modo</dt>
                            <dd className="text-slate-700">
                              {seleccionada.modo_falla_nombre
                                ? `${seleccionada.modo_falla_codigo} - ${seleccionada.modo_falla_nombre}`
                                : '—'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-500">Mecanismo</dt>
                            <dd className="text-slate-700">
                              {seleccionada.mecanismo_falla_nombre
                                ? `${seleccionada.mecanismo_falla_codigo} - ${seleccionada.mecanismo_falla_nombre}`
                                : '—'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-500">Causa</dt>
                            <dd className="text-slate-700">
                              {seleccionada.causa_falla_nombre
                                ? `${seleccionada.causa_falla_codigo} - ${seleccionada.causa_falla_nombre}`
                                : '—'}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'componentes' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase">
                      Resumen de componentes
                    </h3>
                    <div className="border border-slate-300 overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="border border-slate-300 px-2 py-1 text-left w-10">Pos.</th>
                            <th className="border border-slate-300 px-2 py-1 text-left">Componente</th>
                            <th className="border border-slate-300 px-2 py-1 text-left">Denominación</th>
                            <th className="border border-slate-300 px-2 py-1 text-right">Cant.</th>
                            <th className="border border-slate-300 px-2 py-1 text-left">UM</th>
                            <th className="border border-slate-300 px-2 py-1 text-right">Costo unit.</th>
                            <th className="border border-slate-300 px-2 py-1 text-right">Subtotal</th>
                            <th className="border border-slate-300 px-2 py-1 text-left">Fuente</th>
                            {puedeOperar && otAbierta && (
                              <th className="border border-slate-300 px-2 py-1 w-16" />
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {seleccionada.materiales.map((m, i) => (
                            <tr key={m.id} className="hover:bg-slate-50">
                              <td className="border border-slate-300 px-2 py-1 text-slate-500">
                                {String((i + 1) * 10).padStart(4, '0')}
                              </td>
                              <td className="border border-slate-300 px-2 py-1 font-medium text-slate-700">
                                {m.material_codigo}
                              </td>
                              <td className="border border-slate-300 px-2 py-1">
                                {materiales.find((mat) => mat.id === m.material)?.descripcion || '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-1 text-right">{m.cantidad}</td>
                              <td className="border border-slate-300 px-2 py-1">
                                {materiales.find((mat) => mat.id === m.material)?.unidad_medida || '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-1 text-right">
                                S/ {m.costo_unitario}
                              </td>
                              <td className="border border-slate-300 px-2 py-1 text-right">
                                S/ {m.subtotal.toFixed(2)}
                              </td>
                              <td className="border border-slate-300 px-2 py-1 text-slate-500">
                                {m.fuente}
                              </td>
                              {puedeOperar && otAbierta && (
                                <td className="border border-slate-300 px-2 py-1 text-center">
                                  <button
                                    onClick={() => quitarMaterial(m.id)}
                                    className="text-red-600 hover:underline"
                                  >
                                    Quitar
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                          {puedeOperar && otAbierta && (
                            <tr className="bg-slate-50">
                              <td className="border border-slate-300 px-2 py-1 text-slate-500">
                                {String((seleccionada.materiales.length + 1) * 10).padStart(4, '0')}
                              </td>
                              <td className="border border-slate-300 px-1 py-1" colSpan={2}>
                                <select
                                  value={formMaterial.material}
                                  onChange={(e) =>
                                    setFormMaterial((f) => ({ ...f, material: e.target.value }))
                                  }
                                  className="w-full rounded border border-slate-300 text-xs px-1 py-1"
                                >
                                  <option value="">Material...</option>
                                  {materiales.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.codigo} - {m.descripcion}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="border border-slate-300 px-1 py-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Cant."
                                  value={formMaterial.cantidad}
                                  onChange={(e) =>
                                    setFormMaterial((f) => ({ ...f, cantidad: e.target.value }))
                                  }
                                  className="w-full rounded border border-slate-300 text-xs px-1 py-1 text-right"
                                />
                              </td>
                              <td className="border border-slate-300 px-2 py-1 text-slate-500">
                                {materiales.find((m) => m.id === Number(formMaterial.material))
                                  ?.unidad_medida || '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-1 text-right text-slate-500">
                                {materiales.find((m) => m.id === Number(formMaterial.material))
                                  ?.costo_unitario ?? '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-1" />
                              <td className="border border-slate-300 px-1 py-1">
                                <select
                                  value={formMaterial.fuente}
                                  onChange={(e) =>
                                    setFormMaterial((f) => ({ ...f, fuente: e.target.value }))
                                  }
                                  className="w-full rounded border border-slate-300 text-xs px-1 py-1"
                                >
                                  <option value="STOCK_LOCAL">Stock local</option>
                                  <option value="TRASLADO">Traslado</option>
                                  <option value="COMPRA_NORMAL">Compra normal</option>
                                  <option value="COMPRA_EMERGENCIA">Compra emergencia</option>
                                </select>
                              </td>
                              <td className="border border-slate-300 px-2 py-1 text-center">
                                <button
                                  onClick={registrarMaterial}
                                  disabled={!formMaterial.material || !formMaterial.cantidad}
                                  title={
                                    !formMaterial.material || !formMaterial.cantidad
                                      ? 'Selecciona un material y escribe la cantidad'
                                      : undefined
                                  }
                                  className="text-emerald-700 font-medium hover:underline disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
                                >
                                  Agregar
                                </button>
                              </td>
                            </tr>
                          )}
                          {seleccionada.materiales.length === 0 && !(puedeOperar && otAbierta) && (
                            <tr>
                              <td colSpan={9} className="border border-slate-300 px-2 py-3 text-center text-slate-500">
                                Sin componentes registrados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {tab === 'tecnicos' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase">
                      Técnicos asignados
                    </h3>
                    <div className="border border-slate-300 overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="border border-slate-300 px-2 py-1 text-left w-10">Pos.</th>
                            <th className="border border-slate-300 px-2 py-1 text-left">Técnico</th>
                            <th className="border border-slate-300 px-2 py-1 text-left">Fecha</th>
                            <th className="border border-slate-300 px-2 py-1 text-right">Horas</th>
                            {puedeOperar && otAbierta && (
                              <th className="border border-slate-300 px-2 py-1 w-16" />
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {seleccionada.asignaciones.map((a, i) => (
                            <tr key={a.id} className="hover:bg-slate-50">
                              <td className="border border-slate-300 px-2 py-1 text-slate-500">
                                {String((i + 1) * 10).padStart(4, '0')}
                              </td>
                              <td className="border border-slate-300 px-2 py-1 font-medium text-slate-700">
                                {a.tecnico_nombre}
                              </td>
                              <td className="border border-slate-300 px-2 py-1">{a.fecha}</td>
                              <td className="border border-slate-300 px-2 py-1 text-right">
                                {a.horas_reales ?? a.horas_planificadas}
                              </td>
                              {puedeOperar && otAbierta && (
                                <td className="border border-slate-300 px-2 py-1 text-center">
                                  <button
                                    onClick={() => quitarHoras(a.id)}
                                    className="text-red-600 hover:underline"
                                  >
                                    Quitar
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                          {puedeOperar && otAbierta && (
                            <tr className="bg-slate-50">
                              <td className="border border-slate-300 px-2 py-1 text-slate-500">
                                {String((seleccionada.asignaciones.length + 1) * 10).padStart(4, '0')}
                              </td>
                              <td className="border border-slate-300 px-1 py-1">
                                <select
                                  value={formHoras.tecnico}
                                  onChange={(e) => setFormHoras((f) => ({ ...f, tecnico: e.target.value }))}
                                  className="w-full rounded border border-slate-300 text-xs px-1 py-1"
                                >
                                  <option value="">Técnico...</option>
                                  {tecnicos.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.nombre}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="border border-slate-300 px-1 py-1">
                                <input
                                  type="date"
                                  value={formHoras.fecha}
                                  onChange={(e) => setFormHoras((f) => ({ ...f, fecha: e.target.value }))}
                                  className="w-full rounded border border-slate-300 text-xs px-1 py-1"
                                />
                              </td>
                              <td className="border border-slate-300 px-1 py-1">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="Horas"
                                  value={formHoras.horas_reales}
                                  onChange={(e) =>
                                    setFormHoras((f) => ({ ...f, horas_reales: e.target.value }))
                                  }
                                  className="w-full rounded border border-slate-300 text-xs px-1 py-1 text-right"
                                />
                              </td>
                              <td className="border border-slate-300 px-2 py-1 text-center">
                                <button
                                  onClick={registrarHoras}
                                  disabled={!formHoras.tecnico || !formHoras.fecha || !formHoras.horas_reales}
                                  title={
                                    !formHoras.tecnico || !formHoras.fecha || !formHoras.horas_reales
                                      ? 'Selecciona un técnico, fecha y horas'
                                      : undefined
                                  }
                                  className="text-emerald-700 font-medium hover:underline disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
                                >
                                  Agregar
                                </button>
                              </td>
                            </tr>
                          )}
                          {seleccionada.asignaciones.length === 0 && !(puedeOperar && otAbierta) && (
                            <tr>
                              <td colSpan={5} className="border border-slate-300 px-2 py-3 text-center text-slate-500">
                                Sin técnicos asignados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {tab === 'costos' && (
                  <div className="text-sm text-slate-700 space-y-1">
                    <p>Mano de obra: S/ {seleccionada.costo_mano_obra}</p>
                    <p>Materiales: S/ {seleccionada.costo_materiales}</p>
                    <p className="font-semibold">Total: S/ {seleccionada.costo_total}</p>
                    <p className="text-xs text-slate-500">
                      Tiempo de parada: {seleccionada.tiempo_parada_horas} h
                    </p>
                  </div>
                )}

                {tab === 'adjuntos' && (
                  <div>
                    <ul className="text-sm space-y-1">
                      {adjuntos.map((a) => (
                        <li key={a.id}>
                          <a
                            href={a.archivo}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {a.archivo.split('/').pop()}
                          </a>{' '}
                          <span className="text-xs text-slate-500">({a.subido_por})</span>
                        </li>
                      ))}
                      {adjuntos.length === 0 && (
                        <li className="text-slate-500">Sin adjuntos todavía.</li>
                      )}
                    </ul>
                    {puedeOperar && (
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={subirAdjunto}
                        disabled={subiendo}
                        className="mt-2 text-xs"
                      />
                    )}
                  </div>
                )}

                {tab === 'bitacora' && (
                  <ul className="text-xs space-y-1 text-slate-500">
                    {seleccionada.bitacora.map((b) => (
                      <li key={b.id}>
                        {new Date(b.fecha).toLocaleString()} - {b.evento}
                        {b.detalle && <span className="text-slate-500"> ({b.detalle})</span>}
                      </li>
                    ))}
                    {seleccionada.bitacora.length === 0 && (
                      <li className="text-slate-500">Sin eventos registrados.</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
