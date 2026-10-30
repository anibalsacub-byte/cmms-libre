import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Aviso, Paginated } from '../types'
import Badge from '../components/Badge'

const ESTADO_COLORS: Record<string, string> = {
  ABIERTO: 'bg-amber-100 text-amber-700',
  EN_EVALUACION: 'bg-blue-100 text-blue-700',
  CONVERTIDO_OT: 'bg-emerald-100 text-emerald-700',
  RECHAZADO: 'bg-slate-200 text-slate-600',
  CERRADO: 'bg-slate-100 text-slate-500',
}

export default function Notices() {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [loadingId, setLoadingId] = useState<number | null>(null)

  function load() {
    api.get<Paginated<Aviso>>('/notices/avisos/').then((res) => setAvisos(res.data.results))
  }

  useEffect(load, [])

  async function convertir(aviso: Aviso) {
    setLoadingId(aviso.id)
    try {
      await api.post(`/notices/avisos/${aviso.id}/convertir-a-ot/`, {})
      load()
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Avisos de mantenimiento</h1>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Número</th>
              <th className="text-left px-4 py-2">Activo</th>
              <th className="text-left px-4 py-2">Descripción</th>
              <th className="text-left px-4 py-2">Prioridad</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-left px-4 py-2">Reportado por</th>
              <th className="text-left px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {avisos.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-700">{a.numero}</td>
                <td className="px-4 py-2">
                  {a.activo_codigo} - {a.activo_nombre}
                </td>
                <td className="px-4 py-2 max-w-xs truncate" title={a.descripcion}>
                  {a.descripcion}
                </td>
                <td className="px-4 py-2">
                  <Badge value={a.prioridad} />
                </td>
                <td className="px-4 py-2">
                  <Badge value={a.estado} map={ESTADO_COLORS} />
                </td>
                <td className="px-4 py-2 text-slate-500">{a.reportado_por}</td>
                <td className="px-4 py-2">
                  {a.estado === 'ABIERTO' || a.estado === 'EN_EVALUACION' ? (
                    <button
                      onClick={() => convertir(a)}
                      disabled={loadingId === a.id}
                      className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-3 py-1 disabled:opacity-50"
                    >
                      {loadingId === a.id ? 'Creando OT...' : 'Convertir a OT'}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
