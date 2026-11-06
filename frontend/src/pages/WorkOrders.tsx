import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type {
  Adjunto,
  Material,
  OrdenTrabajo,
  OrdenTrabajoDetalle,
  Paginated,
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
  const [cierre, setCierre] = useState({ trabajo_realizado: '', tiempo_parada_horas: '' })

  function load() {
    api.get<Paginated<OrdenTrabajo>>('/workorders/ordenes/').then((res) => setOrdenes(res.data.results))
  }

  useEffect(load, [])
  useEffect(() => {
    api.get<Paginated<Tecnico>>('/hr/tecnicos/').then((res) => setTecnicos(res.data.results))
    api.get<Paginated<Material>>('/inventory/materiales/').then((res) => setMateriales(res.data.results))
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
  }

  async function recargarSeleccionada() {
    if (!seleccionada) return
    const { data } = await api.get<OrdenTrabajoDetalle>(`/workorders/ordenes/${seleccionada.id}/`)
    setSeleccionada(data)
  }

  async function cambiarEstado(estado: string) {
    if (!seleccionada) return
    if (estado === 'CERRADA') {
      setCierre({ trabajo_realizado: seleccionada.trabajo_realizado || '', tiempo_parada_horas: '' })
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
    try {
      const { data } = await api.post<OrdenTrabajoDetalle>(`/workorders/ordenes/${seleccionada.id}/cerrar/`, {
        trabajo_realizado: cierre.trabajo_realizado,
        tiempo_parada_horas: cierre.tiempo_parada_horas || 0,
      })
      setSeleccionada(data)
      setMostrarCierre(false)
      load()
    } finally {
      setCambiando(false)
    }
  }

  async function registrarHoras(e: React.FormEvent) {
    e.preventDefault()
    if (!seleccionada || !formHoras.tecnico || !formHoras.fecha || !formHoras.horas_reales) return
    await api.post('/workorders/asignaciones/', {
      orden_trabajo: seleccionada.id,
      tecnico: Number(formHoras.tecnico),
      fecha: formHoras.fecha,
      horas_planificadas: formHoras.horas_reales,
      horas_reales: formHoras.horas_reales,
    })
    setFormHoras({ tecnico: '', fecha: '', horas_reales: '' })
    recargarSeleccionada()
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
    await api.post('/workorders/materiales-utilizados/', {
      orden_trabajo: seleccionada.id,
      material: mat.id,
      cantidad: formMaterial.cantidad,
      costo_unitario: mat.costo_unitario,
      fuente: formMaterial.fuente,
    })
    setFormMaterial({ material: '', cantidad: '', fuente: 'STOCK_LOCAL' })
    recargarSeleccionada()
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Número</th>
                <th className="text-left px-3 py-2">Estado</th>
                <th className="text-left px-3 py-2">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ordenes.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => abrir(o.id)}
                  className={`cursor-pointer hover:bg-slate-50 ${
                    seleccionada?.id === o.id ? 'bg-slate-100' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-slate-700">
                    {o.numero}
                    <div className="text-xs text-slate-400 font-normal">{o.activo_codigo}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{o.estado}</td>
                  <td className="px-3 py-2 text-slate-500">S/ {o.costo_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200">
          {!seleccionada ? (
            <p className="text-sm text-slate-400 p-4">Selecciona una OT para ver su detalle.</p>
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
                    <span className="text-xs text-slate-400">{seleccionada.tipo}</span>
                  </div>
                </div>

                <div className="max-w-xs">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
                  <select
                    value={seleccionada.estado}
                    disabled={cambiando || !puedeOperar}
                    onChange={(e) => cambiarEstado(e.target.value)}
                    className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5 disabled:bg-slate-100 disabled:text-slate-400"
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
                          <li className="text-slate-400">Sin tareas registradas.</li>
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
                              <td className="border border-slate-300 px-2 py-1 text-slate-400">
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
                              <td className="border border-slate-300 px-2 py-1 text-slate-400">
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
                              <td className="border border-slate-300 px-2 py-1 text-slate-400">
                                {materiales.find((m) => m.id === Number(formMaterial.material))
                                  ?.unidad_medida || '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-1 text-right text-slate-400">
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
                                  className="text-emerald-700 font-medium hover:underline"
                                >
                                  Agregar
                                </button>
                              </td>
                            </tr>
                          )}
                          {seleccionada.materiales.length === 0 && !(puedeOperar && otAbierta) && (
                            <tr>
                              <td colSpan={9} className="border border-slate-300 px-2 py-3 text-center text-slate-400">
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
                              <td className="border border-slate-300 px-2 py-1 text-slate-400">
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
                              <td className="border border-slate-300 px-2 py-1 text-slate-400">
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
                                  className="text-emerald-700 font-medium hover:underline"
                                >
                                  Agregar
                                </button>
                              </td>
                            </tr>
                          )}
                          {seleccionada.asignaciones.length === 0 && !(puedeOperar && otAbierta) && (
                            <tr>
                              <td colSpan={5} className="border border-slate-300 px-2 py-3 text-center text-slate-400">
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
                          <span className="text-xs text-slate-400">({a.subido_por})</span>
                        </li>
                      ))}
                      {adjuntos.length === 0 && (
                        <li className="text-slate-400">Sin adjuntos todavía.</li>
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
                      </li>
                    ))}
                    {seleccionada.bitacora.length === 0 && (
                      <li className="text-slate-400">Sin eventos registrados.</li>
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
