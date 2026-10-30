import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Activo, Paginated } from '../types'
import Badge from '../components/Badge'

export default function Assets() {
  const [activos, setActivos] = useState<Activo[]>([])

  useEffect(() => {
    api.get<Paginated<Activo>>('/assets/activos/').then((res) => setActivos(res.data.results))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Activos y estructura técnica</h1>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Código</th>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Clase</th>
              <th className="text-left px-4 py-2">Ubicación técnica</th>
              <th className="text-left px-4 py-2">Criticidad</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-left px-4 py-2">Horas operación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activos.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-700">{a.codigo}</td>
                <td className="px-4 py-2">{a.nombre}</td>
                <td className="px-4 py-2 text-slate-500">{a.clase_nombre}</td>
                <td className="px-4 py-2 text-slate-500">{a.ubicacion_tecnica_nombre}</td>
                <td className="px-4 py-2">
                  <Badge value={a.criticidad} />
                </td>
                <td className="px-4 py-2 text-slate-500">{a.estado}</td>
                <td className="px-4 py-2 text-slate-500">{a.horas_operacion_acumuladas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
