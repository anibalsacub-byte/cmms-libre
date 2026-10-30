import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../api/client'
import type { ParetoData } from '../types'

function ParetoChart({ title, data }: { title: string; data: { nombre: string; total: number }[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">{title}</h2>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">Sin datos en el período.</p>
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

  useEffect(() => {
    api.get<ParetoData>(`/kpis/pareto/?dias=${dias}`).then((res) => setPareto(res.data))
  }, [dias])

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
    </div>
  )
}
