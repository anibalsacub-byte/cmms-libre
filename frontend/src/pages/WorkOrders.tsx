import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { OrdenTrabajo, OrdenTrabajoDetalle, Paginated } from '../types'
import Badge from '../components/Badge'

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
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([])
  const [seleccionada, setSeleccionada] = useState<OrdenTrabajoDetalle | null>(null)
  const [cambiando, setCambiando] = useState(false)

  function load() {
    api.get<Paginated<OrdenTrabajo>>('/workorders/ordenes/').then((res) => setOrdenes(res.data.results))
  }

  useEffect(load, [])

  async function abrir(id: number) {
    const { data } = await api.get<OrdenTrabajoDetalle>(`/workorders/ordenes/${id}/`)
    setSeleccionada(data)
  }

  async function cambiarEstado(estado: string) {
    if (!seleccionada) return
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
                  <td className="px-4 py-2 text-slate-500">${o.costo_total}</td>
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
                  disabled={cambiando}
                  onChange={(e) => cambiarEstado(e.target.value)}
                  className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>

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
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Materiales</h3>
                <ul className="text-sm space-y-1">
                  {seleccionada.materiales.map((m) => (
                    <li key={m.id}>
                      {m.material_codigo} x{m.cantidad} - ${m.subtotal.toFixed(2)}
                    </li>
                  ))}
                  {seleccionada.materiales.length === 0 && (
                    <li className="text-slate-400">Sin materiales registrados.</li>
                  )}
                </ul>
              </div>

              <div className="text-sm text-slate-700 border-t pt-2 space-y-1">
                <p>Mano de obra: ${seleccionada.costo_mano_obra}</p>
                <p>Materiales: ${seleccionada.costo_materiales}</p>
                <p className="font-semibold">Total: ${seleccionada.costo_total}</p>
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
