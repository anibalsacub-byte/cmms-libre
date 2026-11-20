import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type {
  Almacen,
  Material,
  OrdenCompra,
  OrdenTrabajo,
  Paginated,
  Proveedor,
  SolicitudMaterial,
} from '../types'
import Badge from '../components/Badge'
import { useAuth } from '../context/AuthContext'

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

const TABS = [
  { key: 'solicitudes', label: 'Solicitudes' },
  { key: 'compras', label: 'Órdenes de compra' },
  { key: 'proveedores', label: 'Proveedores' },
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

const SOLICITUD_VACIA = {
  orden_trabajo: '',
  material: '',
  cantidad: '',
  fuente: 'STOCK_LOCAL' as SolicitudMaterial['fuente'],
  costo_estimado: '',
  tiempo_estimado_horas: '',
}

const OC_VACIA = {
  material: '',
  orden_trabajo: '',
  tipo: 'NORMAL' as OrdenCompra['tipo'],
  cantidad: '',
  proveedor_registrado: '',
  proveedor: '',
  costo_estimado: '',
  tiempo_entrega_dias: '',
  almacen_destino: '',
}

const PROVEEDOR_VACIO = {
  nombre: '',
  contacto: '',
  telefono: '',
  email: '',
  lead_time_dias: '',
  condiciones: '',
  activo: true,
}

const GENERAR_OC_VACIO = { almacen_destino: '', proveedor_registrado: '', tiempo_entrega_dias: '' }

export default function Purchasing() {
  const { puedeGestionar, esAdministrador } = useAuth()
  const [tab, setTab] = useState<TabKey>('solicitudes')

  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [solicitudes, setSolicitudes] = useState<SolicitudMaterial[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [ordenesTrabajo, setOrdenesTrabajo] = useState<OrdenTrabajo[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])

  const [formSolicitud, setFormSolicitud] = useState(SOLICITUD_VACIA)
  const [errorSolicitud, setErrorSolicitud] = useState<string | null>(null)
  const [generandoOcPara, setGenerandoOcPara] = useState<number | null>(null)
  const [formGenerarOc, setFormGenerarOc] = useState(GENERAR_OC_VACIO)

  const [formOc, setFormOc] = useState(OC_VACIA)
  const [errorOc, setErrorOc] = useState<string | null>(null)

  const [editandoProveedor, setEditandoProveedor] = useState<number | null>(null)
  const [formProveedor, setFormProveedor] = useState(PROVEEDOR_VACIO)
  const [errorProveedor, setErrorProveedor] = useState<string | null>(null)

  function cargarOrdenes() {
    api.get<Paginated<OrdenCompra>>('/purchasing/ordenes-compra/').then((r) => setOrdenes(r.data.results))
  }
  function cargarSolicitudes() {
    api
      .get<Paginated<SolicitudMaterial>>('/purchasing/solicitudes-material/')
      .then((r) => setSolicitudes(r.data.results))
  }
  function cargarProveedores() {
    api.get<Paginated<Proveedor>>('/purchasing/proveedores/').then((r) => setProveedores(r.data.results))
  }

  useEffect(() => {
    cargarOrdenes()
    cargarSolicitudes()
    cargarProveedores()
    api.get<Paginated<OrdenTrabajo>>('/workorders/ordenes/').then((r) => setOrdenesTrabajo(r.data.results))
    api.get<Paginated<Material>>('/inventory/materiales/').then((r) => setMateriales(r.data.results))
    api.get<Paginated<Almacen>>('/inventory/almacenes/').then((r) => setAlmacenes(r.data.results))
  }, [])

  const materialesPorId = useMemo(() => {
    const mapa = new Map<number, Material>()
    materiales.forEach((m) => mapa.set(m.id, m))
    return mapa
  }, [materiales])

  // ---- Solicitudes ----

  async function crearSolicitud(e: FormEvent) {
    e.preventDefault()
    if (!formSolicitud.orden_trabajo || !formSolicitud.material || !formSolicitud.cantidad) {
      setErrorSolicitud('OT, material y cantidad son obligatorios.')
      return
    }
    setErrorSolicitud(null)
    try {
      await api.post('/purchasing/solicitudes-material/', {
        orden_trabajo: Number(formSolicitud.orden_trabajo),
        material: Number(formSolicitud.material),
        cantidad: formSolicitud.cantidad,
        fuente: formSolicitud.fuente,
        costo_estimado: formSolicitud.costo_estimado || '0',
        tiempo_estimado_horas: formSolicitud.tiempo_estimado_horas || '0',
      })
      setFormSolicitud(SOLICITUD_VACIA)
      cargarSolicitudes()
    } catch (err) {
      setErrorSolicitud(detalleError(err, 'No se pudo crear la solicitud.'))
    }
  }

  function abrirGenerarOc(s: SolicitudMaterial) {
    setGenerandoOcPara(s.id)
    setFormGenerarOc(GENERAR_OC_VACIO)
  }

  async function confirmarGenerarOc(s: SolicitudMaterial) {
    if (!formGenerarOc.almacen_destino) {
      window.alert('Indica el almacén de destino.')
      return
    }
    try {
      await api.post(`/purchasing/solicitudes-material/${s.id}/generar-orden-compra/`, {
        almacen_destino: Number(formGenerarOc.almacen_destino),
        proveedor_registrado: formGenerarOc.proveedor_registrado
          ? Number(formGenerarOc.proveedor_registrado)
          : null,
        tiempo_entrega_dias: formGenerarOc.tiempo_entrega_dias || undefined,
      })
      setGenerandoOcPara(null)
      cargarSolicitudes()
      cargarOrdenes()
    } catch (err) {
      window.alert(detalleError(err, 'No se pudo generar la orden de compra.'))
    }
  }

  // ---- Órdenes de compra ----

  async function crearOc(e: FormEvent) {
    e.preventDefault()
    if (!formOc.material || !formOc.cantidad || !formOc.almacen_destino) {
      setErrorOc('Material, cantidad y almacén de destino son obligatorios.')
      return
    }
    setErrorOc(null)
    try {
      const proveedorReg = proveedores.find((p) => p.id === Number(formOc.proveedor_registrado))
      await api.post('/purchasing/ordenes-compra/', {
        material: Number(formOc.material),
        orden_trabajo: formOc.orden_trabajo ? Number(formOc.orden_trabajo) : null,
        tipo: formOc.tipo,
        cantidad: formOc.cantidad,
        proveedor_registrado: formOc.proveedor_registrado ? Number(formOc.proveedor_registrado) : null,
        proveedor: formOc.proveedor || proveedorReg?.nombre || '',
        costo_estimado: formOc.costo_estimado || '0',
        tiempo_entrega_dias: formOc.tiempo_entrega_dias || proveedorReg?.lead_time_dias || 0,
        almacen_destino: Number(formOc.almacen_destino),
      })
      setFormOc(OC_VACIA)
      cargarOrdenes()
    } catch (err) {
      setErrorOc(detalleError(err, 'No se pudo crear la orden de compra.'))
    }
  }

  async function cambiarEstadoOc(o: OrdenCompra, estado: string) {
    if (estado === 'RECIBIDA' && !window.confirm(`¿Confirmas la recepción de ${o.numero}? Esto sumará ${o.cantidad} al stock de ${o.almacen_destino_codigo}.`)) {
      return
    }
    try {
      await api.post(`/purchasing/ordenes-compra/${o.id}/cambiar-estado/`, { estado })
      cargarOrdenes()
      cargarSolicitudes()
    } catch (err) {
      window.alert(detalleError(err, 'No se pudo actualizar la orden de compra.'))
    }
  }

  // ---- Proveedores ----

  function nuevoProveedor() {
    setEditandoProveedor(0)
    setFormProveedor(PROVEEDOR_VACIO)
    setErrorProveedor(null)
  }
  function editarProveedor(p: Proveedor) {
    setEditandoProveedor(p.id)
    setFormProveedor({
      nombre: p.nombre,
      contacto: p.contacto,
      telefono: p.telefono,
      email: p.email,
      lead_time_dias: String(p.lead_time_dias),
      condiciones: p.condiciones,
      activo: p.activo,
    })
    setErrorProveedor(null)
  }
  async function guardarProveedor(e: FormEvent) {
    e.preventDefault()
    if (!formProveedor.nombre) {
      setErrorProveedor('El nombre es obligatorio.')
      return
    }
    setErrorProveedor(null)
    try {
      const payload = {
        ...formProveedor,
        lead_time_dias: formProveedor.lead_time_dias ? Number(formProveedor.lead_time_dias) : 0,
      }
      if (editandoProveedor) {
        await api.patch(`/purchasing/proveedores/${editandoProveedor}/`, payload)
      } else {
        await api.post('/purchasing/proveedores/', payload)
      }
      setEditandoProveedor(null)
      cargarProveedores()
    } catch (err) {
      setErrorProveedor(detalleError(err, 'No se pudo guardar el proveedor.'))
    }
  }
  async function eliminarProveedor(p: Proveedor) {
    if (!window.confirm(`¿Está seguro que desea eliminar el proveedor "${p.nombre}"?`)) return
    try {
      await api.delete(`/purchasing/proveedores/${p.id}/`)
      cargarProveedores()
    } catch (err) {
      window.alert(detalleError(err, 'No se pudo eliminar.'))
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Compras y abastecimiento</h1>

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
          {tab === 'solicitudes' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Decisión de abastecimiento por material: stock local, traslado interno, compra
                normal o de emergencia, cada una con su costo y tiempo asociado.
              </p>
              {puedeGestionar && (
                <form
                  onSubmit={crearSolicitud}
                  className="bg-slate-50 rounded-md p-3 space-y-3 border border-slate-200"
                >
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">OT</label>
                      <select
                        required
                        value={formSolicitud.orden_trabajo}
                        onChange={(e) =>
                          setFormSolicitud((f) => ({ ...f, orden_trabajo: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      >
                        <option value="">Selecciona...</option>
                        {ordenesTrabajo.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.numero}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Material</label>
                      <select
                        required
                        value={formSolicitud.material}
                        onChange={(e) =>
                          setFormSolicitud((f) => ({ ...f, material: e.target.value }))
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
                      <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formSolicitud.cantidad}
                        onChange={(e) =>
                          setFormSolicitud((f) => ({ ...f, cantidad: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Fuente</label>
                      <select
                        value={formSolicitud.fuente}
                        onChange={(e) =>
                          setFormSolicitud((f) => ({
                            ...f,
                            fuente: e.target.value as SolicitudMaterial['fuente'],
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      >
                        {Object.entries(FUENTE_LABELS).map(([valor, label]) => (
                          <option key={valor} value={valor}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Costo est. (S/)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formSolicitud.costo_estimado}
                        onChange={(e) =>
                          setFormSolicitud((f) => ({ ...f, costo_estimado: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                  </div>
                  {errorSolicitud && <p className="text-sm text-red-600">{errorSolicitud}</p>}
                  <button
                    type="submit"
                    className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
                  >
                    Registrar solicitud
                  </button>
                </form>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-2">OT</th>
                      <th className="text-left px-4 py-2">Material</th>
                      <th className="text-left px-4 py-2">Cantidad</th>
                      <th className="text-left px-4 py-2">Fuente</th>
                      <th className="text-left px-4 py-2">Costo est.</th>
                      <th className="text-left px-4 py-2">Estado</th>
                      <th className="text-left px-4 py-2">OC</th>
                      {puedeGestionar && <th className="text-left px-4 py-2" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {solicitudes.map((s) => (
                      <Fragment key={s.id}>
                        <tr className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-700">
                            {s.orden_trabajo_numero}
                          </td>
                          <td className="px-4 py-2">{s.material_codigo}</td>
                          <td className="px-4 py-2 text-slate-500">{s.cantidad}</td>
                          <td className="px-4 py-2 text-slate-500">{FUENTE_LABELS[s.fuente]}</td>
                          <td className="px-4 py-2 text-slate-500">S/ {s.costo_estimado}</td>
                          <td className="px-4 py-2 text-slate-500">{s.estado}</td>
                          <td className="px-4 py-2 text-slate-500">{s.orden_compra_numero || '—'}</td>
                          {puedeGestionar && (
                            <td className="px-4 py-2">
                              {!s.orden_compra &&
                                (s.fuente === 'COMPRA_NORMAL' || s.fuente === 'COMPRA_EMERGENCIA') && (
                                  <button
                                    onClick={() => abrirGenerarOc(s)}
                                    className="text-xs font-medium text-emerald-700 hover:underline"
                                  >
                                    Generar OC
                                  </button>
                                )}
                            </td>
                          )}
                        </tr>
                        {generandoOcPara === s.id && (
                          <tr className="bg-slate-50">
                            <td colSpan={8} className="px-4 py-3">
                              <div className="flex flex-wrap items-end gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">
                                    Almacén destino
                                  </label>
                                  <select
                                    value={formGenerarOc.almacen_destino}
                                    onChange={(e) =>
                                      setFormGenerarOc((f) => ({
                                        ...f,
                                        almacen_destino: e.target.value,
                                      }))
                                    }
                                    className="rounded-md border border-slate-300 text-sm px-2 py-1.5"
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
                                  <label className="block text-xs font-medium text-slate-500 mb-1">
                                    Proveedor
                                  </label>
                                  <select
                                    value={formGenerarOc.proveedor_registrado}
                                    onChange={(e) =>
                                      setFormGenerarOc((f) => ({
                                        ...f,
                                        proveedor_registrado: e.target.value,
                                      }))
                                    }
                                    className="rounded-md border border-slate-300 text-sm px-2 py-1.5"
                                  >
                                    <option value="">Sin especificar</option>
                                    {proveedores.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.nombre}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <button
                                  onClick={() => confirmarGenerarOc(s)}
                                  className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-1.5"
                                >
                                  Confirmar
                                </button>
                                <button
                                  onClick={() => setGenerandoOcPara(null)}
                                  className="text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md px-4 py-1.5"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                    {solicitudes.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                          Sin solicitudes registradas todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'compras' && (
            <div className="space-y-3">
              {puedeGestionar && (
                <form
                  onSubmit={crearOc}
                  className="bg-slate-50 rounded-md p-3 space-y-3 border border-slate-200"
                >
                  <h3 className="text-xs font-semibold text-slate-500 uppercase">
                    Nueva orden de compra directa
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Material</label>
                      <select
                        required
                        value={formOc.material}
                        onChange={(e) => {
                          const mat = materialesPorId.get(Number(e.target.value))
                          setFormOc((f) => ({
                            ...f,
                            material: e.target.value,
                            costo_estimado: f.costo_estimado || mat?.costo_unitario || '',
                          }))
                        }}
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
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        OT (opcional)
                      </label>
                      <select
                        value={formOc.orden_trabajo}
                        onChange={(e) => setFormOc((f) => ({ ...f, orden_trabajo: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      >
                        <option value="">Ninguna</option>
                        {ordenesTrabajo.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.numero}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                      <select
                        value={formOc.tipo}
                        onChange={(e) =>
                          setFormOc((f) => ({ ...f, tipo: e.target.value as OrdenCompra['tipo'] }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="EMERGENCIA">Emergencia</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formOc.cantidad}
                        onChange={(e) => setFormOc((f) => ({ ...f, cantidad: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Proveedor</label>
                      <select
                        value={formOc.proveedor_registrado}
                        onChange={(e) =>
                          setFormOc((f) => ({ ...f, proveedor_registrado: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      >
                        <option value="">Escribir manualmente...</option>
                        {proveedores.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    {!formOc.proveedor_registrado && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Nombre del proveedor
                        </label>
                        <input
                          value={formOc.proveedor}
                          onChange={(e) => setFormOc((f) => ({ ...f, proveedor: e.target.value }))}
                          className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Costo estimado (S/)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formOc.costo_estimado}
                        onChange={(e) => setFormOc((f) => ({ ...f, costo_estimado: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Entrega (días)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formOc.tiempo_entrega_dias}
                        onChange={(e) =>
                          setFormOc((f) => ({ ...f, tiempo_entrega_dias: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Almacén destino
                      </label>
                      <select
                        required
                        value={formOc.almacen_destino}
                        onChange={(e) =>
                          setFormOc((f) => ({ ...f, almacen_destino: e.target.value }))
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
                  </div>
                  {errorOc && <p className="text-sm text-red-600">{errorOc}</p>}
                  <button
                    type="submit"
                    className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
                  >
                    Crear orden de compra
                  </button>
                </form>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-2">Número</th>
                      <th className="text-left px-4 py-2">Material</th>
                      <th className="text-left px-4 py-2">Tipo</th>
                      <th className="text-left px-4 py-2">Cantidad</th>
                      <th className="text-left px-4 py-2">Proveedor</th>
                      <th className="text-left px-4 py-2">Costo est.</th>
                      <th className="text-left px-4 py-2">Entrega (días)</th>
                      <th className="text-left px-4 py-2">Estado</th>
                      {puedeGestionar && <th className="text-left px-4 py-2" />}
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
                        {puedeGestionar && (
                          <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                            {o.estado === 'SOLICITADA' && (
                              <button
                                onClick={() => cambiarEstadoOc(o, 'APROBADA')}
                                className="text-xs font-medium text-slate-600 hover:underline"
                              >
                                Aprobar
                              </button>
                            )}
                            {(o.estado === 'SOLICITADA' || o.estado === 'APROBADA') && (
                              <button
                                onClick={() => cambiarEstadoOc(o, 'EN_TRANSITO')}
                                className="text-xs font-medium text-slate-600 hover:underline"
                              >
                                En tránsito
                              </button>
                            )}
                            {o.estado !== 'RECIBIDA' && o.estado !== 'CANCELADA' && (
                              <>
                                <button
                                  onClick={() => cambiarEstadoOc(o, 'RECIBIDA')}
                                  className="text-xs font-medium text-emerald-700 hover:underline"
                                >
                                  Recibir
                                </button>
                                <button
                                  onClick={() => cambiarEstadoOc(o, 'CANCELADA')}
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
                    {ordenes.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                          Sin órdenes de compra todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'proveedores' && (
            <div className="space-y-3">
              {puedeGestionar && (
                <button
                  onClick={nuevoProveedor}
                  className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
                >
                  Nuevo proveedor
                </button>
              )}

              {editandoProveedor !== null && (
                <form
                  onSubmit={guardarProveedor}
                  className="bg-slate-50 rounded-md p-3 space-y-3 border border-slate-200"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                      <input
                        required
                        value={formProveedor.nombre}
                        onChange={(e) =>
                          setFormProveedor((f) => ({ ...f, nombre: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Contacto</label>
                      <input
                        value={formProveedor.contacto}
                        onChange={(e) =>
                          setFormProveedor((f) => ({ ...f, contacto: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Teléfono</label>
                      <input
                        value={formProveedor.telefono}
                        onChange={(e) =>
                          setFormProveedor((f) => ({ ...f, telefono: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                      <input
                        type="email"
                        value={formProveedor.email}
                        onChange={(e) => setFormProveedor((f) => ({ ...f, email: e.target.value }))}
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
                        value={formProveedor.lead_time_dias}
                        onChange={(e) =>
                          setFormProveedor((f) => ({ ...f, lead_time_dias: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-1.5 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={formProveedor.activo}
                          onChange={(e) =>
                            setFormProveedor((f) => ({ ...f, activo: e.target.checked }))
                          }
                        />
                        Activo
                      </label>
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Condiciones comerciales
                      </label>
                      <input
                        value={formProveedor.condiciones}
                        onChange={(e) =>
                          setFormProveedor((f) => ({ ...f, condiciones: e.target.value }))
                        }
                        placeholder="Ej. Contado, 30 días crédito..."
                        className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                      />
                    </div>
                  </div>
                  {errorProveedor && <p className="text-sm text-red-600">{errorProveedor}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoProveedor(null)}
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
                      <th className="text-left px-4 py-2">Nombre</th>
                      <th className="text-left px-4 py-2">Contacto</th>
                      <th className="text-left px-4 py-2">Teléfono</th>
                      <th className="text-left px-4 py-2">Email</th>
                      <th className="text-left px-4 py-2">Lead time</th>
                      <th className="text-left px-4 py-2">Estado</th>
                      {puedeGestionar && <th className="text-left px-4 py-2" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {proveedores.map((p) => (
                      <tr key={p.id} className={p.activo ? 'hover:bg-slate-50' : 'opacity-50'}>
                        <td className="px-4 py-2 font-medium text-slate-700">{p.nombre}</td>
                        <td className="px-4 py-2 text-slate-500">{p.contacto || '—'}</td>
                        <td className="px-4 py-2 text-slate-500">{p.telefono || '—'}</td>
                        <td className="px-4 py-2 text-slate-500">{p.email || '—'}</td>
                        <td className="px-4 py-2 text-slate-500">{p.lead_time_dias} d</td>
                        <td className="px-4 py-2 text-slate-500">{p.activo ? 'Activo' : 'Inactivo'}</td>
                        {puedeGestionar && (
                          <td className="px-4 py-2 space-x-3 whitespace-nowrap">
                            <button
                              onClick={() => editarProveedor(p)}
                              className="text-xs font-medium text-slate-600 hover:underline"
                            >
                              Editar
                            </button>
                            {esAdministrador && (
                              <button
                                onClick={() => eliminarProveedor(p)}
                                className="text-xs font-medium text-red-600 hover:underline"
                              >
                                Eliminar
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {proveedores.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                          Sin proveedores todavía.
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
