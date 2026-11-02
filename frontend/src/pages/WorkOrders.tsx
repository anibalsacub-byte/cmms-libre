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

export default function WorkOrders() {
  const { puedeOperar } = useAuth()
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([])
  const [seleccionada, setSeleccionada] = useState<OrdenTrabajoDetalle | null>(null)
  const [cambiando, setCambiando] = useState(false)
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])

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
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">Número</th>
                <th className="text-left px-4 py-2">Activo</th>
                <th className="text-left px-4 py-2">Tipo</th>
                <th className="text-left px-4 py-2">Prioridad</th>
                <th className="text-left px-4 py-2">Estado</th>
                <th className="text-left px-4 py-2">Costo total</th>
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
                  <td className="px-4 py-2 font-medium text-slate-700">{o.numero}</td>
                  <td className="px-4 py-2">{o.activo_codigo}</td>
                  <td className="px-4 py-2 text-slate-500">{o.tipo}</td>
                  <td className="px-4 py-2">
                    <Badge value={o.prioridad} />
                  </td>
                  <td className="px-4 py-2 text-slate-500">{o.estado}</td>
                  <td className="px-4 py-2 text-slate-500">S/ {o.costo_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          {!seleccionada ? (
            <p className="text-sm text-slate-400">Selecciona una OT para ver su detalle.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-slate-800">{seleccionada.numero}</h2>
                <p className="text-xs text-slate-500">{seleccionada.activo_codigo}</p>
              </div>

              <div>
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

              <p className="text-sm text-slate-600">{seleccionada.descripcion}</p>

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

              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">
                  Técnicos asignados
                </h3>
                <ul className="text-sm space-y-1">
                  {seleccionada.asignaciones.map((a) => (
                    <li key={a.id}>
                      {a.tecnico_nombre} - {a.horas_reales ?? a.horas_planificadas} h ({a.fecha})
                    </li>
                  ))}
                  {seleccionada.asignaciones.length === 0 && (
                    <li className="text-slate-400">Sin técnicos asignados.</li>
                  )}
                </ul>
                {puedeOperar && (
                  <form onSubmit={registrarHoras} className="mt-2 flex flex-wrap gap-1 items-end">
                    <select
                      required
                      value={formHoras.tecnico}
                      onChange={(e) => setFormHoras((f) => ({ ...f, tecnico: e.target.value }))}
                      className="rounded-md border border-slate-300 text-xs px-2 py-1"
                    >
                      <option value="">Técnico...</option>
                      {tecnicos.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      required
                      value={formHoras.fecha}
                      onChange={(e) => setFormHoras((f) => ({ ...f, fecha: e.target.value }))}
                      className="rounded-md border border-slate-300 text-xs px-2 py-1"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      placeholder="Horas"
                      value={formHoras.horas_reales}
                      onChange={(e) => setFormHoras((f) => ({ ...f, horas_reales: e.target.value }))}
                      className="w-20 rounded-md border border-slate-300 text-xs px-2 py-1"
                    />
                    <button className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-2 py-1">
                      Registrar horas
                    </button>
                  </form>
                )}
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Materiales</h3>
                <ul className="text-sm space-y-1">
                  {seleccionada.materiales.map((m) => (
                    <li key={m.id}>
                      {m.material_codigo} x{m.cantidad} - S/ {m.subtotal.toFixed(2)}
                    </li>
                  ))}
                  {seleccionada.materiales.length === 0 && (
                    <li className="text-slate-400">Sin materiales registrados.</li>
                  )}
                </ul>
                {puedeOperar && (
                  <form onSubmit={registrarMaterial} className="mt-2 flex flex-wrap gap-1 items-end">
                    <select
                      required
                      value={formMaterial.material}
                      onChange={(e) => setFormMaterial((f) => ({ ...f, material: e.target.value }))}
                      className="rounded-md border border-slate-300 text-xs px-2 py-1"
                    >
                      <option value="">Material...</option>
                      {materiales.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.codigo}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="Cant."
                      value={formMaterial.cantidad}
                      onChange={(e) => setFormMaterial((f) => ({ ...f, cantidad: e.target.value }))}
                      className="w-16 rounded-md border border-slate-300 text-xs px-2 py-1"
                    />
                    <select
                      value={formMaterial.fuente}
                      onChange={(e) => setFormMaterial((f) => ({ ...f, fuente: e.target.value }))}
                      className="rounded-md border border-slate-300 text-xs px-2 py-1"
                    >
                      <option value="STOCK_LOCAL">Stock local</option>
                      <option value="TRASLADO">Traslado</option>
                      <option value="COMPRA_NORMAL">Compra normal</option>
                      <option value="COMPRA_EMERGENCIA">Compra emergencia</option>
                    </select>
                    <button className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-2 py-1">
                      Registrar material
                    </button>
                  </form>
                )}
              </div>

              <div className="text-sm text-slate-700 border-t pt-2 space-y-1">
                <p>Mano de obra: S/ {seleccionada.costo_mano_obra}</p>
                <p>Materiales: S/ {seleccionada.costo_materiales}</p>
                <p className="font-semibold">Total: S/ {seleccionada.costo_total}</p>
                <p className="text-xs text-slate-500">
                  Tiempo de parada: {seleccionada.tiempo_parada_horas} h
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Adjuntos</h3>
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

              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Bitácora</h3>
                <ul className="text-xs space-y-1 text-slate-500">
                  {seleccionada.bitacora.map((b) => (
                    <li key={b.id}>
                      {new Date(b.fecha).toLocaleString()} - {b.evento}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
