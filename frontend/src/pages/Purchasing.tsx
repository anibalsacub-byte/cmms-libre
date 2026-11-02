import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { OrdenCompra, Paginated, SolicitudMaterial } from '../types'
import Badge from '../components/Badge'

const FUENTE_LABELS: Record<string, string> = {
  STOCK_LOCAL: 'Stock local',
  TRASLADO: 'Traslado entre almacenes',
  COMPRA_NORMAL: 'Compra normal',
  COMPRA_EMERGENCIA: 'Compra de emergencia',
}

const TIPO_COLORS: Record<string, string> = {
  NORMAL: 'bg-slate-100 text-slate-600',
  EMERGENCIA: 'bg-red-100 text-red-700',
}

export default function Purchasing() {
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [solicitudes, setSolicitudes] = useState<SolicitudMaterial[]>([])

  useEffect(() => {
    api
      .get<Paginated<OrdenCompra>>('/purchasing/ordenes-compra/')
      .then((r) => setOrdenes(r.data.results))
    api
      .get<Paginated<SolicitudMaterial>>('/purchasing/solicitudes-material/')
      .then((r) => setSolicitudes(r.data.results))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">Compras y abastecimiento</h1>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          Solicitudes de material por OT
        </h2>
        <p className="text-xs text-slate-500 mb-2">
          Decisión de abastecimiento por material: stock local, traslado interno, compra normal o
          de emergencia, cada una con su costo y tiempo asociado.
        </p>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">OT</th>
                <th className="text-left px-4 py-2">Material</th>
                <th className="text-left px-4 py-2">Cantidad</th>
                <th className="text-left px-4 py-2">Fuente</th>
                <th className="text-left px-4 py-2">Costo estimado</th>
                <th className="text-left px-4 py-2">Tiempo estimado (h)</th>
                <th className="text-left px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {solicitudes.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-700">{s.orden_trabajo_numero}</td>
                  <td className="px-4 py-2">{s.material_codigo}</td>
                  <td className="px-4 py-2 text-slate-500">{s.cantidad}</td>
                  <td className="px-4 py-2 text-slate-500">{FUENTE_LABELS[s.fuente]}</td>
                  <td className="px-4 py-2 text-slate-500">S/ {s.costo_estimado}</td>
                  <td className="px-4 py-2 text-slate-500">{s.tiempo_estimado_horas}</td>
                  <td className="px-4 py-2 text-slate-500">{s.estado}</td>
                </tr>
              ))}
              {solicitudes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    Sin solicitudes registradas todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Órdenes de compra</h2>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">Número</th>
                <th className="text-left px-4 py-2">Material</th>
                <th className="text-left px-4 py-2">Tipo</th>
                <th className="text-left px-4 py-2">Cantidad</th>
                <th className="text-left px-4 py-2">Proveedor</th>
                <th className="text-left px-4 py-2">Costo estimado</th>
                <th className="text-left px-4 py-2">Entrega (días)</th>
                <th className="text-left px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ordenes.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-700">{o.numero}</td>
                  <td className="px-4 py-2">{o.material_codigo}</td>
                  <td className="px-4 py-2">
                    <Badge value={o.tipo} map={TIPO_COLORS} />
                  </td>
                  <td className="px-4 py-2 text-slate-500">{o.cantidad}</td>
                  <td className="px-4 py-2 text-slate-500">{o.proveedor || '—'}</td>
                  <td className="px-4 py-2 text-slate-500">S/ {o.costo_estimado}</td>
                  <td className="px-4 py-2 text-slate-500">{o.tiempo_entrega_dias}</td>
                  <td className="px-4 py-2 text-slate-500">{o.estado}</td>
                </tr>
              ))}
              {ordenes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    Sin órdenes de compra todavía.
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
