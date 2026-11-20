import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../api/client'
import type { Activo, ClaseActivo, Paginated, ParetoData, UbicacionTecnica } from '../types'

type ReporteCostos = {
  periodo_dias: number
  costo_total: number
  numero_ot: number
  por_activo: { activo_codigo: string; activo_nombre: string; costo: number; numero_ot: number }[]
  por_ubicacion: { ubicacion_codigo: string; ubicacion_nombre: string; costo: number }[]
}

function ParetoChart({ title, data }: { title: string; data: { nombre: string; total: number }[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">{title}</h2>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500">Sin datos en el período.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} fontSize={11} />
            <YAxis type="category" dataKey="nombre" width={160} fontSize={11} />
            <Tooltip />
            <Bar dataKey="total" fill="#334155" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default function Reports() {
  const [dias, setDias] = useState(90)
  const [pareto, setPareto] = useState<ParetoData | null>(null)
  const [exportando, setExportando] = useState(false)

  const [costos, setCostos] = useState<ReporteCostos | null>(null)
  const [activos, setActivos] = useState<Activo[]>([])
  const [clases, setClases] = useState<ClaseActivo[]>([])
  const [ubicaciones, setUbicaciones] = useState<UbicacionTecnica[]>([])
  const [activoId, setActivoId] = useState('')
  const [claseId, setClaseId] = useState('')
  const [ubicacionId, setUbicacionId] = useState('')
  const [generandoPdf, setGenerandoPdf] = useState(false)

  useEffect(() => {
    api.get<ParetoData>(`/kpis/pareto/?dias=${dias}`).then((res) => setPareto(res.data))
  }, [dias])

  useEffect(() => {
    api.get<Paginated<Activo>>('/assets/activos/').then((res) => setActivos(res.data.results))
    api.get<Paginated<ClaseActivo>>('/assets/clases-activo/').then((res) => setClases(res.data.results))
    api
      .get<Paginated<UbicacionTecnica>>('/assets/ubicaciones-tecnicas/')
      .then((res) => setUbicaciones(res.data.results))
  }, [])

  const paramsCostos = () => {
    const params = new URLSearchParams({ dias: String(dias) })
    if (activoId) params.set('activo', activoId)
    if (claseId) params.set('clase', claseId)
    if (ubicacionId) params.set('ubicacion', ubicacionId)
    return params
  }

  useEffect(() => {
    api
      .get<ReporteCostos>(`/kpis/reporte-costos/?${paramsCostos().toString()}`)
      .then((res) => setCostos(res.data))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias, activoId, claseId, ubicacionId])

  async function descargarPdfCostos() {
    setGenerandoPdf(true)
    try {
      const params = paramsCostos()
      params.set('formato', 'pdf')
      const res = await api.get(`/kpis/reporte-costos/?${params.toString()}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = 'reporte_costos.pdf'
      link.click()
      window.URL.revokeObjectURL(url)
    } finally {
      setGenerandoPdf(false)
    }
  }

  async function exportarCsv() {
    setExportando(true)
    try {
      const res = await api.get('/workorders/ordenes/exportar-csv/', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = 'ordenes_trabajo.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Reportes</h1>
          <p className="text-sm text-slate-500">
            Pareto de fallas (ISO 14224) para priorizar qué atacar primero.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
            className="rounded-md border border-slate-300 text-sm px-3 py-1.5 bg-white"
          >
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={365}>Último año</option>
          </select>
          <button
            onClick={exportarCsv}
            disabled={exportando}
            className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2 disabled:opacity-50"
          >
            {exportando ? 'Exportando...' : 'Exportar OT a CSV'}
          </button>
        </div>
      </div>

      {pareto && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ParetoChart title="Por modo de falla" data={pareto.por_modo} />
          <ParetoChart title="Por mecanismo de falla" data={pareto.por_mecanismo} />
          <ParetoChart title="Por causa de falla" data={pareto.por_causa} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">
            Reporte de costos por activo / ubicación / período
          </h2>
          <button
            onClick={descargarPdfCostos}
            disabled={generandoPdf}
            className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2 disabled:opacity-50"
          >
            {generandoPdf ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
        </div>

        {costos && (
          <>
            <p className="text-sm text-slate-600">
              <span className="font-semibold">Costo total: S/ {costos.costo_total.toLocaleString()}</span>
              {' · '}
              {costos.numero_ot} orden(es) de trabajo en los últimos {costos.periodo_dias} días.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Por activo</h3>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {costos.por_activo.map((a) => (
                        <tr key={a.activo_codigo}>
                          <td className="py-1.5 pr-2">
                            {a.activo_codigo} - {a.activo_nombre}
                          </td>
                          <td className="py-1.5 text-right text-slate-500">{a.numero_ot} OT</td>
                          <td className="py-1.5 pl-2 text-right font-medium">
                            S/ {a.costo.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {costos.por_activo.length === 0 && (
                        <tr>
                          <td className="py-3 text-slate-500">Sin datos en el período.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Por ubicación</h3>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {costos.por_ubicacion.map((u) => (
                        <tr key={u.ubicacion_codigo}>
                          <td className="py-1.5 pr-2">
                            {u.ubicacion_codigo} - {u.ubicacion_nombre}
                          </td>
                          <td className="py-1.5 pl-2 text-right font-medium">
                            S/ {u.costo.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {costos.por_ubicacion.length === 0 && (
                        <tr>
                          <td className="py-3 text-slate-500">Sin datos en el período.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
