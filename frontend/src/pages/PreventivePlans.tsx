import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Paginated, PlanPreventivo } from '../types'
import { useAuth } from '../context/AuthContext'

export default function PreventivePlans() {
  const { puedeGestionar } = useAuth()
  const [planes, setPlanes] = useState<PlanPreventivo[]>([])
  const [generando, setGenerando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  function load() {
    api.get<Paginated<PlanPreventivo>>('/pm-plans/planes/').then((res) => setPlanes(res.data.results))
  }

  useEffect(load, [])

  async function generarOrdenes() {
    setGenerando(true)
    setMensaje(null)
    try {
      const { data } = await api.post('/pm-plans/planes/generar-ordenes/', {})
      setMensaje(
        data.generadas > 0
          ? `Se generaron ${data.generadas} orden(es) de trabajo preventivas.`
          : 'No hay planes vencidos por ahora.',
      )
      load()
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Planes de mantenimiento preventivo</h1>
          <p className="text-sm text-slate-500">
            Por calendario o por horómetro; generan una OT preventiva automáticamente al vencer.
          </p>
        </div>
        {puedeGestionar && (
          <button
            onClick={generarOrdenes}
            disabled={generando}
            className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2 disabled:opacity-50"
          >
            {generando ? 'Generando...' : 'Generar órdenes pendientes'}
          </button>
        )}
      </div>

      {mensaje && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 text-sm">
          {mensaje}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Plan</th>
              <th className="text-left px-4 py-2">Activo</th>
              <th className="text-left px-4 py-2">Tipo</th>
              <th className="text-left px-4 py-2">Próximo vencimiento</th>
              <th className="text-left px-4 py-2">Última generación</th>
              <th className="text-left px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {planes.map((p) => (
              <tr key={p.id} className={p.vencido ? 'bg-amber-50' : 'hover:bg-slate-50'}>
                <td className="px-4 py-2 font-medium text-slate-700">{p.nombre}</td>
                <td className="px-4 py-2">{p.activo_codigo}</td>
                <td className="px-4 py-2 text-slate-500">
                  {p.tipo === 'CALENDARIO' ? 'Calendario' : 'Horómetro'}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {p.tipo === 'CALENDARIO' ? p.fecha_proxima : `${p.horometro_proximo} h`}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {p.ultima_generacion ? new Date(p.ultima_generacion).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-2">
                  {!p.activo_flag ? (
                    <span className="text-xs text-slate-400">Inactivo</span>
                  ) : p.vencido ? (
                    <span className="text-xs font-medium text-amber-700">Vencido</span>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600">Al día</span>
                  )}
                </td>
              </tr>
            ))}
            {planes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Sin planes preventivos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
