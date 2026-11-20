import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type {
  Almacen,
  Material,
  MovimientoStock,
  Paginated,
  StockAlmacen,
  TrasladoAlmacen,
} from '../types'
import ImportarExportarCsv from '../components/ImportarExportarCsv'
import { useAuth } from '../context/AuthContext'

type GrupoMaterial = { id: number; nombre: string }

const TABS = [
  { key: 'inventario', label: 'Inventario' },
  { key: 'materiales', label: 'Materiales' },
  { key: 'almacenes', label: 'Almacenes' },
  { key: 'movimientos', label: 'Movimientos' },
  { key: 'traslados', label: 'Traslados' },
] as const
type TabKey = (typeof TABS)[number]['key']

function detalleError(err: unknown, fallback: string) {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const data = (err as { response?: { data?: Record<string, unknown> } }).response?.data
    if (!data) return fallback
    if (typeof data.detail === 'string') return data.detail
    const primerCampo = Object.values(data)[0]
    if (typeof primerCampo === 'string') return primerCampo
    if (Array.isArray(primerCampo) && typeof primerCampo[0] === 'string') return primerCampo[0]
    return fallback
  }
  return fallback
}

const FILTROS_VACIOS = {
  texto: '',
  almacen: '',
  clase: '',
  grupo: '',
  estadoStock: '',
  stockMin: '',
  stockMax: '',
}

const MATERIAL_VACIO = {
  codigo: '',
  descripcion: '',
  grupo: '',
  clase: '',
  unidad_medida: 'UND',
  costo_unitario: '',
  tiempo_entrega_dias: '',
  estado: 'ACTIVO',
}

const ALMACEN_VACIO = { codigo: '', nombre: '', ubicacion: '' }

const MOVIMIENTO_VACIO = { material: '', almacen: '', tipo: 'ENTRADA', cantidad: '', referencia: '' }

const TRASLADO_VACIO = { material: '', almacen_origen: '', almacen_destino: '', cantidad: '' }

export default function Inventory() {
  const { puedeGestionar, esAdministrador } = useAuth()
  const [tab, setTab] = useState<TabKey>('inventario')

  const [materiales, setMateriales] = useState<Material[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [stock, setStock] = useState<StockAlmacen[]>([])
  const [grupos, setGrupos] = useState<GrupoMaterial[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([])
  const [traslados, setTraslados] = useState<TrasladoAlmacen[]>([])

  const [filtros, setFiltros] = useState(FILTROS_VACIOS)

  const [editandoMaterial, setEditandoMaterial] = useState<number | null>(null)
  const [formMaterial, setFormMaterial] = useState(MATERIAL_VACIO)
  const [errorMaterial, setErrorMaterial] = useState<string | null>(null)

  const [editandoAlmacen, setEditandoAlmacen] = useState<number | null>(null)
  const [formAlmacen, setFormAlmacen] = useState(ALMACEN_VACIO)
  const [errorAlmacen, setErrorAlmacen] = useState<string | null>(null)

  const [formMovimiento, setFormMovimiento] = useState(MOVIMIENTO_VACIO)
  const [errorMovimiento, setErrorMovimiento] = useState<string | null>(null)
  const [filtroMovMaterial, setFiltroMovMaterial] = useState('')

  const [formTraslado, setFormTraslado] = useState(TRASLADO_VACIO)
  const [errorTraslado, setErrorTraslado] = useState<string | null>(null)

  const [editandoUmbral, setEditandoUmbral] = useState<number | null>(null)
  const [formUmbral, setFormUmbral] = useState({ stock_minimo: '', stock_maximo: '', ubicacion_en_almacen: '' })

  function cargarMateriales() {
    api.get<Paginated<Material>>('/inventory/materiales/').then((res) => setMateriales(res.data.results))
  }
  function cargarAlmacenes() {
    api.get<Paginated<Almacen>>('/inventory/almacenes/').then((res) => setAlmacenes(res.data.results))
  }
  function cargarStock() {
    api.get<Paginated<StockAlmacen>>('/inventory/stock/').then((res) => setStock(res.data.results))
  }
  function cargarMovimientos() {
    api.get<Paginated<MovimientoStock>>('/inventory/movimientos/').then((res) => setMovimientos(res.data.results))
  }
  function cargarTraslados() {
    api.get<Paginated<TrasladoAlmacen>>('/inventory/traslados/').then((res) => setTraslados(res.data.results))
  }

  useEffect(() => {
    cargarMateriales()
    cargarAlmacenes()
    cargarStock()
    api.get<Paginated<GrupoMaterial>>('/inventory/grupos-material/').then((res) => setGrupos(res.data.results))
    cargarMovimientos()
    cargarTraslados()
  }, [])

  // ---- Inventario (filtros de solo lectura) ----

  const materialesPorId = useMemo(() => {
    const mapa = new Map<number, Material>()
    materiales.forEach((m) => mapa.set(m.id, m))
    return mapa
  }, [materiales])

  const clases = useMemo(
    () => Array.from(new Set(materiales.map((m) => m.clase).filter(Boolean))).sort(),
    [materiales],
  )
  const gruposEnUso = useMemo(() => {
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

  function empezarUmbral(s: StockAlmacen) {
    setEditandoUmbral(s.id)
    setFormUmbral({
      stock_minimo: s.stock_minimo,
      stock_maximo: s.stock_maximo ?? '',
      ubicacion_en_almacen: s.ubicacion_en_almacen,
    })
  }

  async function guardarUmbral(id: number) {
    try {
      await api.patch(`/inventory/stock/${id}/`, {
        stock_minimo: formUmbral.stock_minimo || 0,
        stock_maximo: formUmbral.stock_maximo || null,
        ubicacion_en_almacen: formUmbral.ubicacion_en_almacen,
      })
      setEditandoUmbral(null)
      cargarStock()
    } catch (err) {
      window.alert(detalleError(err, 'No se pudo guardar.'))
    }
  }

  // ---- Materiales ----

  function nuevoMaterial() {
    setEditandoMaterial(0)
    setFormMaterial(MATERIAL_VACIO)
    setErrorMaterial(null)
  }
  function editarMaterial(m: Material) {
    setEditandoMaterial(m.id)
    setFormMaterial({
      codigo: m.codigo,
      descripcion: m.descripcion,
      grupo: String(m.grupo),
      clase: m.clase,
      unidad_medida: m.unidad_medida,
      costo_unitario: m.costo_unitario,
      tiempo_entrega_dias: String(m.tiempo_entrega_dias),
      estado: m.estado,
    })
    setErrorMaterial(null)
  }
  async function guardarMaterial(e: FormEvent) {
    e.preventDefault()
    if (!formMaterial.codigo || !formMaterial.descripcion || !formMaterial.grupo) {
      setErrorMaterial('Código, descripción y grupo son obligatorios.')
      return
    }
    setErrorMaterial(null)
    try {
      const payload = {
        ...formMaterial,
        grupo: Number(formMaterial.grupo),
        costo_unitario: formMaterial.costo_unitario || '0',
        tiempo_entrega_dias: formMaterial.tiempo_entrega_dias ? Number(formMaterial.tiempo_entrega_dias) : 0,
      }
      if (editandoMaterial) {
        await api.patch(`/inventory/materiales/${editandoMaterial}/`, payload)
      } else {
        await api.post('/inventory/materiales/', payload)
      }
      setEditandoMaterial(null)
      cargarMateriales()
    } catch (err) {
      setErrorMaterial(detalleError(err, 'No se pudo guardar el material.'))
    }
  }
  async function eliminarMaterial(m: Material) {
    if (!window.confirm(`¿Está seguro que desea eliminar "${m.codigo} - ${m.descripcion}"?`)) return
    try {
      await api.delete(`/inventory/materiales/${m.id}/`)
      cargarMateriales()
    } catch (err) {
      window.alert(detalleError(err, 'No se pudo eliminar.'))
    }
  }

  // ---- Almacenes ----

  function nuevoAlmacen() {
    setEditandoAlmacen(0)
    setFormAlmacen(ALMACEN_VACIO)
    setErrorAlmacen(null)
  }
  function editarAlmacen(a: Almacen) {
    setEditandoAlmacen(a.id)
    setFormAlmacen({ codigo: a.codigo, nombre: a.nombre, ubicacion: a.ubicacion })
    setErrorAlmacen(null)
  }
  async function guardarAlmacen(e: FormEvent) {
    e.preventDefault()
    if (!formAlmacen.codigo || !formAlmacen.nombre) {
      setErrorAlmacen('Código y nombre son obligatorios.')
      return
    }
    setErrorAlmacen(null)
    try {
      if (editandoAlmacen) {
        await api.patch(`/inventory/almacenes/${editandoAlmacen}/`, formAlmacen)
      } else {
        await api.post('/inventory/almacenes/', formAlmacen)
      }
      setEditandoAlmacen(null)
      cargarAlmacenes()
    } catch (err) {
      setErrorAlmacen(detalleError(err, 'No se pudo guardar el almacén.'))
    }
  }
  async function eliminarAlmacen(a: Almacen) {
    if (!window.confirm(`¿Está seguro que desea eliminar "${a.codigo} - ${a.nombre}"?`)) return
    try {
      await api.delete(`/inventory/almacenes/${a.id}/`)
      cargarAlmacenes()
    } catch (err) {
      window.alert(detalleError(err, 'No se pudo eliminar.'))
    }
  }

  // ---- Movimientos ----

  async function registrarMovimiento(e: FormEvent) {
    e.preventDefault()
    if (!formMovimiento.material || !formMovimiento.almacen || !formMovimiento.cantidad) {
      setErrorMovimiento('Material, almacén y cantidad son obligatorios.')
      return
    }
    setErrorMovimiento(null)
    try {
      await api.post('/inventory/movimientos/', {
        material: Number(formMovimiento.material),
        almacen: Number(formMovimiento.almacen),
        tipo: formMovimiento.tipo,
        cantidad: formMovimiento.cantidad,
        referencia: formMovimiento.referencia,
      })
      setFormMovimiento(MOVIMIENTO_VACIO)
      cargarMovimientos()
      cargarStock()
      cargarMateriales()
    } catch (err) {
      setErrorMovimiento(detalleError(err, 'No se pudo registrar el movimiento.'))
    }
  }

  const movimientosFiltrados = useMemo(() => {
    if (!filtroMovMaterial) return movimientos
    return movimientos.filter((m) => String(m.material) === filtroMovMaterial)
  }, [movimientos, filtroMovMaterial])

  // ---- Traslados ----

  async function solicitarTraslado(e: FormEvent) {
    e.preventDefault()
    if (
      !formTraslado.material ||
      !formTraslado.almacen_origen ||
      !formTraslado.almacen_destino ||
      !formTraslado.cantidad
    ) {
      setErrorTraslado('Todos los campos son obligatorios.')
      return
    }
    if (formTraslado.almacen_origen === formTraslado.almacen_destino) {
      setErrorTraslado('El almacén de origen y destino deben ser distintos.')
      return
    }
    setErrorTraslado(null)
    try {
      await api.post('/inventory/traslados/', {
        material: Number(formTraslado.material),
        almacen_origen: Number(formTraslado.almacen_origen),
        almacen_destino: Number(formTraslado.almacen_destino),
        cantidad: formTraslado.cantidad,
      })
      setFormTraslado(TRASLADO_VACIO)
      cargarTraslados()
    } catch (err) {
      setErrorTraslado(detalleError(err, 'No se pudo solicitar el traslado.'))
    }
  }

  async function cambiarEstadoTraslado(t: TrasladoAlmacen, estado: string) {
    try {
      await api.post(`/inventory/traslados/${t.id}/cambiar-estado/`, { estado })
      cargarTraslados()
      cargarStock()
    } catch (err) {
      window.alert(detalleError(err, 'No se pudo actualizar el traslado.'))
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Inventario de mantenimiento (MRO)</h1>

      {bajoMinimo.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {bajoMinimo.length} ítem(s) bajo el stock mínimo:{' '}
          {bajoMinimo.map((s) => `${s.material_codigo} (${s.almacen_codigo})`).join(', ')}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-slate-800 text-slate-800'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {tab === 'inventario' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Material / Descripción
                  </label>
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
                    {gruposEnUso.map(([id, nombre]) => (
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
                <span className="text-xs text-slate-500">{filas.length} resultado(s)</span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-2">Material</th>
                      <th className="text-left px-4 py-2">Descripción</th>
                      <th className="text-left px-4 py-2">Almacén</th>
                      <th className="text-left px-4 py-2">Ubicación</th>
                      <th className="text-left px-4 py-2">Stock</th>
                      <th className="text-left px-4 py-2">Mínimo</th>
                      <th className="text-left px-4 py-2">Máximo</th>
                      <th className="text-left px-4 py-2">Costo unit.</th>
                      <th className="text-left px-4 py-2">Estado</th>
                      {puedeGestionar && <th className="text-left px-4 py-2" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filas.map(({ s, m }) =>
                      editandoUmbral === s.id ? (
                        <tr key={s.id} className="bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-700">{m.codigo}</td>
                          <td className="px-4 py-2">{m.descripcion}</td>
                          <td className="px-4 py-2 text-slate-500">{s.almacen_codigo}</td>
                          <td className="px-2 py-1">
                            <input
                              value={formUmbral.ubicacion_en_almacen}
                              onChange={(e) =>
                                setFormUmbral((f) => ({ ...f, ubicacion_en_almacen: e.target.value }))
                              }
                              className="w-24 rounded border border-slate-300 text-xs px-1 py-1"
                            />
                          </td>
                          <td className="px-4 py-2">{s.cantidad}</td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              step="0.01"
                              value={formUmbral.stock_minimo}
                              onChange={(e) =>
                                setFormUmbral((f) => ({ ...f, stock_minimo: e.target.value }))
                              }
                              className="w-16 rounded border border-slate-300 text-xs px-1 py-1"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Sin límite"
                              value={formUmbral.stock_maximo}
                              onChange={(e) =>
                                setFormUmbral((f) => ({ ...f, stock_maximo: e.target.value }))
                              }
                              className="w-20 rounded border border-slate-300 text-xs px-1 py-1"
                            />
                          </td>
                          <td className="px-4 py-2 text-slate-500">S/ {m.costo_unitario}</td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => guardarUmbral(s.id)}
                              className="text-xs font-medium text-emerald-700 hover:underline"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditandoUmbral(null)}
                              className="text-xs font-medium text-slate-500 hover:underline"
                            >
                              Cancelar
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={s.id}
                          className={s.bajo_minimo ? 'bg-red-50' : s.sobre_maximo ? 'bg-amber-50' : 'hover:bg-slate-50'}
                        >
                          <td className="px-4 py-2 font-medium text-slate-700">{m.codigo}</td>
                          <td className="px-4 py-2">{m.descripcion}</td>
                          <td className="px-4 py-2 text-slate-500">{s.almacen_codigo}</td>
                          <td className="px-4 py-2 text-slate-500">{s.ubicacion_en_almacen || '—'}</td>
                          <td className="px-4 py-2">
                            {s.cantidad} {m.unidad_medida}
                          </td>
                          <td className="px-4 py-2 text-slate-500">{s.stock_minimo}</td>
                          <td className="px-4 py-2 text-slate-500">{s.stock_maximo ?? '—'}</td>
                          <td className="px-4 py-2 text-slate-500">S/ {m.costo_unitario}</td>
                          <td className="px-4 py-2">
                            {s.bajo_minimo ? (
                              <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                                Bajo mínimo
                              </span>
                            ) : s.sobre_maximo ? (
                              <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                                Sobre máximo
                              </span>
                            ) : (
                              <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                                Disponible
                              </span>
                            )}
                          </td>
                          {puedeGestionar && (
                            <td className="px-4 py-2">
                              <button
                                onClick={() => empezarUmbral(s)}
                                className="text-xs font-medium text-slate-600 hover:underline"
                              >
                                Editar
                              </button>
                            </td>
                          )}
                        </tr>
                      ),
                    )}
                    {filas.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                          Sin resultados para estos filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'materiales' && (
            <div className="space-y-3">
              {puedeGestionar && (
                <button
                  onClick={nuevoMaterial}
                  className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
                >
                  Nuevo material
                </button>
              )}

              {puedeGestionar && (
                <ImportarExportarCsv
                  recurso="/inventory/materiales/"
                  nombreArchivo="materiales"
                  onImportado={cargarMateriales}
                />
              )}

              {editandoMaterial !== null && (
                <form
                  onSubmit={guardarMaterial}
                  className="bg-slate-50 rounded-md p-3 space-y-3 border border-slate-200"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Código</label>
                      <input
                        required
                        value={formMaterial.codigo}
                        onChange={(e) => setFormMaterial((f) => ({ ...f, codigo: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
                      <input
                        required
                        value={formMaterial.descripcion}
                        onChange={(e) =>
                          setFormMaterial((f) => ({ ...f, descripcion: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Clase</label>
                      <input
                        value={formMaterial.clase}
                        onChange={(e) => setFormMaterial((f) => ({ ...f, clase: e.target.value }))}
                        placeholder="Ej. REPUESTO"
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Grupo</label>
                      <select
                        required
                        value={formMaterial.grupo}
                        onChange={(e) => setFormMaterial((f) => ({ ...f, grupo: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      >
                        <option value="">Selecciona...</option>
                        {grupos.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Unidad</label>
                      <input
                        value={formMaterial.unidad_medida}
                        onChange={(e) =>
                          setFormMaterial((f) => ({ ...f, unidad_medida: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Costo unitario (S/)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formMaterial.costo_unitario}
                        onChange={(e) =>
                          setFormMaterial((f) => ({ ...f, costo_unitario: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Lead time (días)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formMaterial.tiempo_entrega_dias}
                        onChange={(e) =>
                          setFormMaterial((f) => ({ ...f, tiempo_entrega_dias: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
                      <select
                        value={formMaterial.estado}
                        onChange={(e) => setFormMaterial((f) => ({ ...f, estado: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      >
                        <option value="ACTIVO">Activo</option>
                        <option value="DESCONTINUADO">Descontinuado</option>
                        <option value="BLOQUEADO">Bloqueado</option>
                      </select>
                    </div>
                  </div>
                  {errorMaterial && <p className="text-sm text-red-600">{errorMaterial}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoMaterial(null)}
                      className="text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md px-4 py-2"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-2">Código</th>
                      <th className="text-left px-4 py-2">Descripción</th>
                      <th className="text-left px-4 py-2">Grupo</th>
                      <th className="text-left px-4 py-2">Costo unit.</th>
                      <th className="text-left px-4 py-2">Stock total</th>
                      <th className="text-left px-4 py-2">Estado</th>
                      {puedeGestionar && <th className="text-left px-4 py-2" />}
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
                        <td className="px-4 py-2 text-slate-500">{m.estado}</td>
                        {puedeGestionar && (
                          <td className="px-4 py-2 space-x-3 whitespace-nowrap">
                            <button
                              onClick={() => editarMaterial(m)}
                              className="text-xs font-medium text-slate-600 hover:underline"
                            >
                              Editar
                            </button>
                            {esAdministrador && (
                              <button
                                onClick={() => eliminarMaterial(m)}
                                className="text-xs font-medium text-red-600 hover:underline"
                              >
                                Eliminar
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {materiales.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                          Sin materiales todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'almacenes' && (
            <div className="space-y-3">
              {puedeGestionar && (
                <button
                  onClick={nuevoAlmacen}
                  className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
                >
                  Nuevo almacén
                </button>
              )}

              {editandoAlmacen !== null && (
                <form
                  onSubmit={guardarAlmacen}
                  className="bg-slate-50 rounded-md p-3 space-y-3 border border-slate-200"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Código</label>
                      <input
                        required
                        value={formAlmacen.codigo}
                        onChange={(e) => setFormAlmacen((f) => ({ ...f, codigo: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                      <input
                        required
                        value={formAlmacen.nombre}
                        onChange={(e) => setFormAlmacen((f) => ({ ...f, nombre: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Ubicación</label>
                      <input
                        value={formAlmacen.ubicacion}
                        onChange={(e) => setFormAlmacen((f) => ({ ...f, ubicacion: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                  </div>
                  {errorAlmacen && <p className="text-sm text-red-600">{errorAlmacen}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoAlmacen(null)}
                      className="text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md px-4 py-2"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-2">Código</th>
                      <th className="text-left px-4 py-2">Nombre</th>
                      <th className="text-left px-4 py-2">Ubicación</th>
                      {puedeGestionar && <th className="text-left px-4 py-2" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {almacenes.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-700">{a.codigo}</td>
                        <td className="px-4 py-2">{a.nombre}</td>
                        <td className="px-4 py-2 text-slate-500">{a.ubicacion || '—'}</td>
                        {puedeGestionar && (
                          <td className="px-4 py-2 space-x-3 whitespace-nowrap">
                            <button
                              onClick={() => editarAlmacen(a)}
                              className="text-xs font-medium text-slate-600 hover:underline"
                            >
                              Editar
                            </button>
                            {esAdministrador && (
                              <button
                                onClick={() => eliminarAlmacen(a)}
                                className="text-xs font-medium text-red-600 hover:underline"
                              >
                                Eliminar
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {almacenes.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                          Sin almacenes todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'movimientos' && (
            <div className="space-y-3">
              {puedeGestionar && (
                <form
                  onSubmit={registrarMovimiento}
                  className="bg-slate-50 rounded-md p-3 space-y-3 border border-slate-200"
                >
                  <h3 className="text-xs font-semibold text-slate-500 uppercase">
                    Registrar entrada, salida o ajuste
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Material</label>
                      <select
                        required
                        value={formMovimiento.material}
                        onChange={(e) =>
                          setFormMovimiento((f) => ({ ...f, material: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      >
                        <option value="">Selecciona...</option>
                        {materiales.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.codigo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Almacén</label>
                      <select
                        required
                        value={formMovimiento.almacen}
                        onChange={(e) =>
                          setFormMovimiento((f) => ({ ...f, almacen: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      >
                        <option value="">Selecciona...</option>
                        {almacenes.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.codigo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                      <select
                        value={formMovimiento.tipo}
                        onChange={(e) => setFormMovimiento((f) => ({ ...f, tipo: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      >
                        <option value="ENTRADA">Entrada</option>
                        <option value="SALIDA">Salida</option>
                        <option value="AJUSTE">Ajuste (+/-)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={formMovimiento.cantidad}
                        onChange={(e) =>
                          setFormMovimiento((f) => ({ ...f, cantidad: e.target.value }))
                        }
                        placeholder={formMovimiento.tipo === 'AJUSTE' ? 'Ej. -2 o 5' : undefined}
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Motivo</label>
                      <input
                        value={formMovimiento.referencia}
                        onChange={(e) =>
                          setFormMovimiento((f) => ({ ...f, referencia: e.target.value }))
                        }
                        placeholder="Ej. OT-000012, conteo físico"
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                  </div>
                  {errorMovimiento && <p className="text-sm text-red-600">{errorMovimiento}</p>}
                  <button
                    type="submit"
                    className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
                  >
                    Registrar movimiento
                  </button>
                </form>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-500 uppercase">Historial</h3>
                <select
                  value={filtroMovMaterial}
                  onChange={(e) => setFiltroMovMaterial(e.target.value)}
                  className="rounded-md border border-slate-300 text-xs px-2 py-1"
                >
                  <option value="">Todos los materiales</option>
                  {materiales.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.codigo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-2">Fecha</th>
                      <th className="text-left px-4 py-2">Material</th>
                      <th className="text-left px-4 py-2">Almacén</th>
                      <th className="text-left px-4 py-2">Tipo</th>
                      <th className="text-left px-4 py-2">Cantidad</th>
                      <th className="text-left px-4 py-2">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movimientosFiltrados.map((mv) => (
                      <tr key={mv.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-500">
                          {new Date(mv.fecha).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 font-medium text-slate-700">{mv.material_codigo}</td>
                        <td className="px-4 py-2 text-slate-500">{mv.almacen_codigo}</td>
                        <td className="px-4 py-2 text-slate-500">{mv.tipo}</td>
                        <td className="px-4 py-2">{mv.cantidad}</td>
                        <td className="px-4 py-2 text-slate-500">{mv.referencia || '—'}</td>
                      </tr>
                    ))}
                    {movimientosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                          Sin movimientos todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'traslados' && (
            <div className="space-y-3">
              {puedeGestionar && (
                <form
                  onSubmit={solicitarTraslado}
                  className="bg-slate-50 rounded-md p-3 space-y-3 border border-slate-200"
                >
                  <h3 className="text-xs font-semibold text-slate-500 uppercase">
                    Solicitar traslado entre almacenes
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Material</label>
                      <select
                        required
                        value={formTraslado.material}
                        onChange={(e) =>
                          setFormTraslado((f) => ({ ...f, material: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      >
                        <option value="">Selecciona...</option>
                        {materiales.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.codigo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Origen</label>
                      <select
                        required
                        value={formTraslado.almacen_origen}
                        onChange={(e) =>
                          setFormTraslado((f) => ({ ...f, almacen_origen: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      >
                        <option value="">Selecciona...</option>
                        {almacenes.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.codigo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Destino</label>
                      <select
                        required
                        value={formTraslado.almacen_destino}
                        onChange={(e) =>
                          setFormTraslado((f) => ({ ...f, almacen_destino: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      >
                        <option value="">Selecciona...</option>
                        {almacenes.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.codigo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formTraslado.cantidad}
                        onChange={(e) =>
                          setFormTraslado((f) => ({ ...f, cantidad: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                  </div>
                  {errorTraslado && <p className="text-sm text-red-600">{errorTraslado}</p>}
                  <button
                    type="submit"
                    className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
                  >
                    Solicitar traslado
                  </button>
                </form>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-2">Material</th>
                      <th className="text-left px-4 py-2">Origen</th>
                      <th className="text-left px-4 py-2">Destino</th>
                      <th className="text-left px-4 py-2">Cantidad</th>
                      <th className="text-left px-4 py-2">Estado</th>
                      <th className="text-left px-4 py-2">Solicitado</th>
                      {puedeGestionar && <th className="text-left px-4 py-2" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {traslados.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-700">{t.material_codigo}</td>
                        <td className="px-4 py-2 text-slate-500">{t.almacen_origen_codigo}</td>
                        <td className="px-4 py-2 text-slate-500">{t.almacen_destino_codigo}</td>
                        <td className="px-4 py-2">{t.cantidad}</td>
                        <td className="px-4 py-2 text-slate-500">{t.estado}</td>
                        <td className="px-4 py-2 text-slate-500">
                          {new Date(t.fecha_solicitud).toLocaleDateString()}
                        </td>
                        {puedeGestionar && (
                          <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                            {t.estado === 'SOLICITADO' && (
                              <button
                                onClick={() => cambiarEstadoTraslado(t, 'EN_TRANSITO')}
                                className="text-xs font-medium text-slate-600 hover:underline"
                              >
                                En tránsito
                              </button>
                            )}
                            {(t.estado === 'SOLICITADO' || t.estado === 'EN_TRANSITO') && (
                              <>
                                <button
                                  onClick={() => cambiarEstadoTraslado(t, 'RECIBIDO')}
                                  className="text-xs font-medium text-emerald-700 hover:underline"
                                >
                                  Recibir
                                </button>
                                <button
                                  onClick={() => cambiarEstadoTraslado(t, 'CANCELADO')}
                                  className="text-xs font-medium text-red-600 hover:underline"
                                >
                                  Cancelar
                                </button>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {traslados.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                          Sin traslados todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
