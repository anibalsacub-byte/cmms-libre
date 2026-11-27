import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../api/client'
import type { Activo, ClaseActivo, DashboardData, Paginated, UbicacionTecnica } from '../types'

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-slate-800 mt-1">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [dias, setDias] = useState(30)
  const [activos, setActivos] = useState<Activo[]>([])
  const [clases, setClases] = useState<ClaseActivo[]>([])
  const [ubicaciones, setUbicaciones] = useState<UbicacionTecnica[]>([])
  const [activoId, setActivoId] = useState('')
  const [claseId, setClaseId] = useState('')
  const [ubicacionId, setUbicacionId] = useState('')
  const [mostrarFormulas, setMostrarFormulas] = useState(false)

  useEffect(() => {
    api.get<Paginated<Activo>>('/assets/activos/').then((res) => setActivos(res.data.results))
    api
      .get<Paginated<ClaseActivo>>('/assets/clases-activo/')
      .then((res) => setClases(res.data.results))
    api
      .get<Paginated<UbicacionTecnica>>('/assets/ubicaciones-tecnicas/')
      .then((res) => setUbicaciones(res.data.results))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams({ dias: String(dias) })
    if (activoId) params.set('activo', activoId)
    if (claseId) params.set('clase', claseId)
    if (ubicacionId) params.set('ubicacion', ubicacionId)
    api.get<DashboardData>(`/kpis/dashboard/?${params.toString()}`).then((res) => setData(res.data))
  }, [dias, activoId, claseId, ubicacionId])

  if (!data) return <p className="text-slate-500">Cargando indicadores...</p>

  const { mantenimiento, oee } = data
  const estadoData = Object.entries(mantenimiento.ordenes_por_estado).map(([estado, total]) => ({
    estado,
    total,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-800">Panel de mantenimiento</h1>
        <div className="flex flex-wrap gap-2">
          <select
            value={activoId}
            onChange={(e) => setActivoId(e.target.value)}
            className="rounded-md border border-slate-300 text-sm px-3 py-1.5 bg-white"
          >
            <option value="">Todos los activos</option>
            {activos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.codigo} - {a.nombre}
              </option>
            ))}
          </select>
          <select
            value={claseId}
            onChange={(e) => setClaseId(e.target.value)}
            className="rounded-md border border-slate-300 text-sm px-3 py-1.5 bg-white"
          >
            <option value="">Todas las clases</option>
            {clases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} - {c.nombre}
              </option>
            ))}
          </select>
          <select
            value={ubicacionId}
            onChange={(e) => setUbicacionId(e.target.value)}
            className="rounded-md border border-slate-300 text-sm px-3 py-1.5 bg-white"
          >
            <option value="">Todas las ubicaciones</option>
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.id}>
                {u.codigo} - {u.nombre}
              </option>
            ))}
          </select>
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="MTBF" value={`${mantenimiento.mtbf_horas} h`} hint="Tiempo medio entre fallas" />
        <KpiCard label="MTTR" value={`${mantenimiento.mttr_horas} h`} hint="Tiempo medio de reparación" />
        <KpiCard label="Disponibilidad" value={`${mantenimiento.disponibilidad_pct}%`} />
        <KpiCard label="Downtime" value={`${mantenimiento.downtime_horas} h`} />
        <KpiCard
          label="Nº de fallas"
          value={`${mantenimiento.numero_fallas}`}
          hint="OT correctivas en el período"
        />
        <KpiCard label="Backlog" value={`${mantenimiento.backlog}`} hint="OTs abiertas" />
        <KpiCard label="Avisos abiertos" value={`${mantenimiento.avisos_abiertos}`} />
        <KpiCard
          label="Costo mantenimiento"
          value={`S/ ${mantenimiento.costo_mantenimiento.toLocaleString()}`}
        />
        <KpiCard label="OEE" value={`${oee.oee}%`} hint="Disponibilidad x Rendimiento x Calidad" />
        <KpiCard
          label="% Preventivo"
          value={`${mantenimiento.pct_preventivo}%`}
          hint="De las OT creadas en el período"
        />
        <KpiCard
          label="% Correctivo"
          value={`${mantenimiento.pct_correctivo}%`}
          hint="De las OT creadas en el período"
        />
        <KpiCard
          label="Edad OT abiertas"
          value={`${mantenimiento.edad_promedio_ot_abiertas_dias} días`}
          hint="Promedio desde su creación"
        />
        <KpiCard
          label="Cumplimiento preventivo"
          value={
            mantenimiento.cumplimiento_preventivo_pct === null
              ? 'Sin planes'
              : `${mantenimiento.cumplimiento_preventivo_pct}%`
          }
          hint={`${mantenimiento.total_planes_preventivos_activos} plan(es) activo(s) sin vencer`}
        />
      </div>

      <div>
        <button
          onClick={() => setMostrarFormulas((v) => !v)}
          className="text-xs font-medium text-slate-500 hover:text-slate-700 underline"
        >
          {mostrarFormulas ? 'Ocultar fórmulas' : '¿Cómo se calculan estos indicadores?'}
        </button>
        {mostrarFormulas && (
          <div className="mt-2 bg-white rounded-lg shadow-sm p-4 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <p>
              <strong>MTTR</strong> = horas de parada acumuladas ÷ número de fallas correctivas del
              período.
            </p>
            <p>
              <strong>MTBF</strong> = horas operativas disponibles ÷ número de fallas correctivas,
              donde horas operativas = (activos operativos × horas del período) − downtime.
            </p>
            <p>
              <strong>Disponibilidad</strong> = horas operativas disponibles ÷ horas totales del
              período.
            </p>
            <p>
              <strong>% Preventivo / % Correctivo</strong> = OT de ese tipo creadas en el período ÷
              total de OT creadas en el período.
            </p>
            <p>
              <strong>Costo por activo</strong> = suma del costo (mano de obra + materiales) de las
              OT de ese activo creadas en el período.
            </p>
            <p>
              <strong>Edad de OT abiertas</strong> = promedio de días desde la creación de cada OT
              que sigue sin cerrar o cancelar (no depende del período elegido).
            </p>
            <p>
              <strong>Cumplimiento del plan preventivo</strong> = % de planes preventivos activos
              que hoy NO están vencidos.
            </p>
            <p>
              <strong>OEE</strong> = Disponibilidad × Rendimiento × Calidad de los registros de
              producción del período.
            </p>
          </div>
        )}
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
          <p className="text-xs text-slate-500 mt-4 text-center">
            Basado en {oee.registros} registros de producción.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200 md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Costo por activo (período, top 10)
          </h2>
          {mantenimiento.costo_por_activo.length === 0 ? (
            <p className="text-sm text-slate-500">Sin OT con costo en este período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-2 py-1">Activo</th>
                    <th className="text-right px-2 py-1">Costo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mantenimiento.costo_por_activo.map((c) => (
                    <tr key={c.activo_codigo}>
                      <td className="px-2 py-1.5">
                        {c.activo_codigo} - {c.activo_nombre}
                      </td>
                      <td className="px-2 py-1.5 text-right">S/ {c.costo.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
