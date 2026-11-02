import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Material, Paginated, StockAlmacen } from '../types'

export default function Inventory() {
  const [materiales, setMateriales] = useState<Material[]>([])
  const [stock, setStock] = useState<StockAlmacen[]>([])

  useEffect(() => {
    api.get<Paginated<Material>>('/inventory/materiales/').then((res) => setMateriales(res.data.results))
    api.get<Paginated<StockAlmacen>>('/inventory/stock/').then((res) => setStock(res.data.results))
  }, [])

  const bajoMinimo = stock.filter((s) => s.bajo_minimo)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">Inventario de mantenimiento (MRO)</h1>

      {bajoMinimo.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {bajoMinimo.length} ítem(s) bajo el stock mínimo:{' '}
          {bajoMinimo.map((s) => `${s.material_codigo} (${s.almacen_codigo})`).join(', ')}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Código</th>
              <th className="text-left px-4 py-2">Descripción</th>
              <th className="text-left px-4 py-2">Grupo</th>
              <th className="text-left px-4 py-2">Costo unitario</th>
              <th className="text-left px-4 py-2">Stock total</th>
              <th className="text-left px-4 py-2">Lead time (días)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {materiales.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-700">{m.codigo}</td>
                <td className="px-4 py-2">{m.descripcion}</td>
                <td className="px-4 py-2 text-slate-500">{m.grupo_nombre}</td>
                <td className="px-4 py-2 text-slate-500">S/ {m.costo_unitario}</td>
                <td className="px-4 py-2 text-slate-500">{m.stock_total}</td>
                <td className="px-4 py-2 text-slate-500">{m.tiempo_entrega_dias}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Stock por almacén</h2>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">Material</th>
                <th className="text-left px-4 py-2">Almacén</th>
                <th className="text-left px-4 py-2">Cantidad</th>
                <th className="text-left px-4 py-2">Mínimo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stock.map((s) => (
                <tr key={s.id} className={s.bajo_minimo ? 'bg-red-50' : 'hover:bg-slate-50'}>
                  <td className="px-4 py-2 font-medium text-slate-700">{s.material_codigo}</td>
                  <td className="px-4 py-2 text-slate-500">{s.almacen_codigo}</td>
                  <td className="px-4 py-2">{s.cantidad}</td>
                  <td className="px-4 py-2 text-slate-500">{s.stock_minimo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
