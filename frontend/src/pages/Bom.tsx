import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { EquipoMaterial, Paginated } from '../types'

export default function Bom() {
  const [repuestos, setRepuestos] = useState<EquipoMaterial[]>([])

  useEffect(() => {
    api
      .get<Paginated<EquipoMaterial>>('/bom/repuestos-activo/')
      .then((res) => setRepuestos(res.data.results))
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Repuestos por activo (BOM)</h1>
        <p className="text-sm text-slate-500">
          Qué materiales son compatibles con cada activo, para no buscar repuestos solo por
          descripción.
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Activo</th>
              <th className="text-left px-4 py-2">Material</th>
              <th className="text-left px-4 py-2">Cantidad de referencia</th>
              <th className="text-left px-4 py-2">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {repuestos.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-700">{r.activo_codigo}</td>
                <td className="px-4 py-2">
                  {r.material_codigo} - {r.material_descripcion}
                </td>
                <td className="px-4 py-2 text-slate-500">{r.cantidad_referencia}</td>
                <td className="px-4 py-2 text-slate-500">{r.notas || '—'}</td>
              </tr>
            ))}
            {repuestos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Sin repuestos registrados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
