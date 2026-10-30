import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../api/client'
import type { DashboardData } from '../types'

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-slate-800 mt-1">{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [dias, setDias] = useState(30)

  useEffect(() => {
    api.get<DashboardData>(`/kpis/dashboard/?dias=${dias}`).then((res) => setData(res.data))
  }, [dias])

  if (!data) return <p className="text-slate-500">Cargando indicadores...</p>

  const { mantenimiento, oee } = data
  const estadoData = Object.entries(mantenimiento.ordenes_por_estado).map(([estado, total]) => ({
    estado,
    total,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Panel de mantenimiento</h1>
        <select
          value={dias}
          onChange={(e) => setDias(Number(e.target.value))}
          className="rounded-md border border-slate-300 text-sm px-3 py-1.5 bg-white"
        >
          <option value={7}>Últimos 7 días</option>
          <option value={30}>Últimos 30 días</option>
          <option value={90}>Últimos 90 días</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="MTBF" value={`${mantenimiento.mtbf_horas} h`} hint="Tiempo medio entre fallas" />
        <KpiCard label="MTTR" value={`${mantenimiento.mttr_horas} h`} hint="Tiempo medio de reparación" />
        <KpiCard label="Disponibilidad" value={`${mantenimiento.disponibilidad_pct}%`} />
        <KpiCard label="Downtime" value={`${mantenimiento.downtime_horas} h`} />
        <KpiCard label="Backlog" value={`${mantenimiento.backlog}`} hint="OTs abiertas" />
        <KpiCard label="Avisos abiertos" value={`${mantenimiento.avisos_abiertos}`} />
        <KpiCard
          label="Costo mantenimiento"
          value={`$${mantenimiento.costo_mantenimiento.toLocaleString()}`}
        />
        <KpiCard label="OEE" value={`${oee.oee}%`} hint="Disponibilidad x Rendimiento x Calidad" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Órdenes de trabajo por estado</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={estadoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="estado" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="total" fill="#334155" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">OEE del período</h2>
          <div className="grid grid-cols-3 gap-3 text-center mt-6">
            <div>
              <p className="text-xs text-slate-500">Disponibilidad</p>
              <p className="text-xl font-semibold text-slate-800">{oee.disponibilidad}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Rendimiento</p>
              <p className="text-xl font-semibold text-slate-800">{oee.rendimiento}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Calidad</p>
              <p className="text-xl font-semibold text-slate-800">{oee.calidad}%</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">
            Basado en {oee.registros} registros de producción.
          </p>
        </div>
      </div>
    </div>
  )
}
