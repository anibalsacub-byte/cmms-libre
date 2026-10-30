import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ImpactoOperativoFalla, Paginated, RegistroProduccion } from '../types'

export default function Production() {
  const [registros, setRegistros] = useState<RegistroProduccion[]>([])
  const [impactos, setImpactos] = useState<ImpactoOperativoFalla[]>([])

  useEffect(() => {
    api
      .get<Paginated<RegistroProduccion>>('/production/registros/')
      .then((r) => setRegistros(r.data.results))
    api
      .get<Paginated<ImpactoOperativoFalla>>('/production/impactos-falla/')
      .then((r) => setImpactos(r.data.results))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">Producción y OEE</h1>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Registros de producción</h2>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">Línea</th>
                <th className="text-left px-4 py-2">Fecha</th>
                <th className="text-left px-4 py-2">Turno</th>
                <th className="text-left px-4 py-2">Producidas</th>
                <th className="text-left px-4 py-2">Buenas</th>
                <th className="text-left px-4 py-2">Disponibilidad</th>
                <th className="text-left px-4 py-2">Rendimiento</th>
                <th className="text-left px-4 py-2">Calidad</th>
                <th className="text-left px-4 py-2">OEE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registros.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-700">{r.linea_nombre}</td>
                  <td className="px-4 py-2 text-slate-500">{r.fecha}</td>
                  <td className="px-4 py-2 text-slate-500">{r.turno}</td>
                  <td className="px-4 py-2 text-slate-500">{r.unidades_producidas}</td>
                  <td className="px-4 py-2 text-slate-500">{r.unidades_buenas}</td>
                  <td className="px-4 py-2 text-slate-500">{(r.disponibilidad * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2 text-slate-500">{(r.rendimiento * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2 text-slate-500">{(r.calidad * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2 font-semibold text-slate-700">
                    {(r.oee * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              {registros.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                    Sin registros de producción todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          Impacto operativo de fallas
        </h2>
        <p className="text-xs text-slate-500 mb-2">
          No solo que ocurrió una falla: cómo afectó disponibilidad, velocidad o calidad de la
          línea.
        </p>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">Aviso</th>
                <th className="text-left px-4 py-2">Línea</th>
                <th className="text-left px-4 py-2">Afecta</th>
                <th className="text-left px-4 py-2">Unidades perdidas</th>
                <th className="text-left px-4 py-2">Costo impacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {impactos.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-700">{i.aviso_numero}</td>
                  <td className="px-4 py-2">{i.linea_nombre}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {[
                      i.afecta_disponibilidad && 'Disponibilidad',
                      i.afecta_velocidad && 'Velocidad',
                      i.afecta_calidad && 'Calidad',
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{i.unidades_perdidas}</td>
                  <td className="px-4 py-2 text-slate-500">${i.costo_impacto}</td>
                </tr>
              ))}
              {impactos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Sin impactos registrados todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
