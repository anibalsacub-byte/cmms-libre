import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Paginated, Tecnico } from '../types'

export default function Technicians() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])

  useEffect(() => {
    api.get<Paginated<Tecnico>>('/hr/tecnicos/').then((res) => setTecnicos(res.data.results))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Técnicos</h1>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Código</th>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Especialidad</th>
              <th className="text-left px-4 py-2">Habilidades</th>
              <th className="text-left px-4 py-2">Tarifa/h</th>
              <th className="text-left px-4 py-2">Productividad</th>
              <th className="text-left px-4 py-2">Disponible</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tecnicos.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-700">{t.codigo}</td>
                <td className="px-4 py-2">{t.nombre}</td>
                <td className="px-4 py-2 text-slate-500">{t.especialidad_nombre}</td>
                <td className="px-4 py-2 text-slate-500">{t.habilidades_nombres.join(', ')}</td>
                <td className="px-4 py-2 text-slate-500">S/ {t.tarifa_hora}</td>
                <td className="px-4 py-2 text-slate-500">{t.productividad_pct}%</td>
                <td className="px-4 py-2">
                  {t.disponible ? (
                    <span className="text-emerald-600 text-xs font-medium">Sí</span>
                  ) : (
                    <span className="text-slate-400 text-xs font-medium">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
