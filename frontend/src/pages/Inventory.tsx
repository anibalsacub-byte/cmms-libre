import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { Almacen, Material, Paginated, StockAlmacen } from '../types'

const FILTROS_VACIOS = {
  texto: '',
  almacen: '',
  clase: '',
  grupo: '',
  estadoStock: '',
  stockMin: '',
  stockMax: '',
}

export default function Inventory() {
  const [materiales, setMateriales] = useState<Material[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [stock, setStock] = useState<StockAlmacen[]>([])
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)

  useEffect(() => {
    api.get<Paginated<Material>>('/inventory/materiales/').then((res) => setMateriales(res.data.results))
    api.get<Paginated<Almacen>>('/inventory/almacenes/').then((res) => setAlmacenes(res.data.results))
    api.get<Paginated<StockAlmacen>>('/inventory/stock/').then((res) => setStock(res.data.results))
  }, [])

  const materialesPorId = useMemo(() => {
    const mapa = new Map<number, Material>()
    materiales.forEach((m) => mapa.set(m.id, m))
    return mapa
  }, [materiales])

  const clases = useMemo(
    () => Array.from(new Set(materiales.map((m) => m.clase).filter(Boolean))).sort(),
    [materiales],
  )
  const grupos = useMemo(() => {
    const mapa = new Map<number, string>()
    materiales.forEach((m) => mapa.set(m.grupo, m.grupo_nombre))
    return Array.from(mapa.entries())
  }, [materiales])

  const filas = useMemo(() => {
    return stock
      .map((s) => ({ s, m: materialesPorId.get(s.material) }))
      .filter(({ m }) => m !== undefined)
      .filter(({ s, m }) => {
        const material = m as Material
        if (filtros.texto) {
          const q = filtros.texto.toLowerCase()
          if (!material.codigo.toLowerCase().includes(q) && !material.descripcion.toLowerCase().includes(q)) {
            return false
          }
        }
        if (filtros.almacen && String(s.almacen) !== filtros.almacen) return false
        if (filtros.clase && material.clase !== filtros.clase) return false
        if (filtros.grupo && String(material.grupo) !== filtros.grupo) return false
        if (filtros.estadoStock === 'BAJO_MINIMO' && !s.bajo_minimo) return false
        if (filtros.estadoStock === 'DISPONIBLE' && s.bajo_minimo) return false
        const cantidad = Number(s.cantidad)
        if (filtros.stockMin && cantidad < Number(filtros.stockMin)) return false
        if (filtros.stockMax && cantidad > Number(filtros.stockMax)) return false
        return true
      }) as { s: StockAlmacen; m: Material }[]
  }, [stock, materialesPorId, filtros])

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

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Inventario local</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Material / Descripción</label>
            <input
              placeholder="Ej. rodamiento, 100001"
              value={filtros.texto}
              onChange={(e) => setFiltros((f) => ({ ...f, texto: e.target.value }))}
              className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Almacén</label>
            <select
              value={filtros.almacen}
              onChange={(e) => setFiltros((f) => ({ ...f, almacen: e.target.value }))}
              className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
            >
              <option value="">Todos</option>
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codigo} - {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Clase</label>
            <select
              value={filtros.clase}
              onChange={(e) => setFiltros((f) => ({ ...f, clase: e.target.value }))}
              className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
            >
              <option value="">Todas</option>
              {clases.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Grupo</label>
            <select
              value={filtros.grupo}
              onChange={(e) => setFiltros((f) => ({ ...f, grupo: e.target.value }))}
              className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
            >
              <option value="">Todos</option>
              {grupos.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Estado stock</label>
            <select
              value={filtros.estadoStock}
              onChange={(e) => setFiltros((f) => ({ ...f, estadoStock: e.target.value }))}
              className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
            >
              <option value="">Todos</option>
              <option value="DISPONIBLE">Disponible</option>
              <option value="BAJO_MINIMO">Bajo mínimo</option>
            </select>
          </div>
          <div className="flex gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Stock mín.</label>
              <input
                type="number"
                value={filtros.stockMin}
                onChange={(e) => setFiltros((f) => ({ ...f, stockMin: e.target.value }))}
                className="w-20 rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Stock máx.</label>
              <input
                type="number"
                value={filtros.stockMax}
                onChange={(e) => setFiltros((f) => ({ ...f, stockMax: e.target.value }))}
                className="w-20 rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setFiltros(FILTROS_VACIOS)}
            className="text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md px-3 py-1.5 border border-slate-300"
          >
            Limpiar filtros
          </button>
          <span className="text-xs text-slate-400">{filas.length} resultado(s)</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Material</th>
              <th className="text-left px-4 py-2">Descripción</th>
              <th className="text-left px-4 py-2">Clase</th>
              <th className="text-left px-4 py-2">Grupo</th>
              <th className="text-left px-4 py-2">Almacén</th>
              <th className="text-left px-4 py-2">Ubicación</th>
              <th className="text-left px-4 py-2">Stock</th>
              <th className="text-left px-4 py-2">Unidad</th>
              <th className="text-left px-4 py-2">Costo unit.</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-left px-4 py-2">Lead time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map(({ s, m }) => (
              <tr key={s.id} className={s.bajo_minimo ? 'bg-red-50' : 'hover:bg-slate-50'}>
                <td className="px-4 py-2 font-medium text-slate-700">{m.codigo}</td>
                <td className="px-4 py-2">{m.descripcion}</td>
                <td className="px-4 py-2 text-slate-500">{m.clase || '—'}</td>
                <td className="px-4 py-2 text-slate-500">{m.grupo_nombre}</td>
                <td className="px-4 py-2 text-slate-500">{s.almacen_codigo}</td>
                <td className="px-4 py-2 text-slate-500">{s.ubicacion_en_almacen || '—'}</td>
                <td className="px-4 py-2">{s.cantidad}</td>
                <td className="px-4 py-2 text-slate-500">{m.unidad_medida}</td>
                <td className="px-4 py-2 text-slate-500">S/ {m.costo_unitario}</td>
                <td className="px-4 py-2">
                  {s.bajo_minimo ? (
                    <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                      Bajo mínimo
                    </span>
                  ) : (
                    <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                      Disponible
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-500">{m.tiempo_entrega_dias} d</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-slate-400">
                  Sin resultados para estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
