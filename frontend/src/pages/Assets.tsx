import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Activo, ClaseActivo, Paginated, UbicacionTecnica } from '../types'
import Badge from '../components/Badge'
import { useAuth } from '../context/AuthContext'

const ACTIVO_VACIO = {
  codigo: '',
  nombre: '',
  clase: '',
  ubicacion_tecnica: '',
  sistema: '',
  criticidad: 'MEDIA',
  fabricante: '',
  modelo: '',
  numero_serie: '',
}

export default function Assets() {
  const { puedeGestionar } = useAuth()
  const [activos, setActivos] = useState<Activo[]>([])
  const [clases, setClases] = useState<ClaseActivo[]>([])
  const [ubicaciones, setUbicaciones] = useState<UbicacionTecnica[]>([])

  const [mostrarTaxonomia, setMostrarTaxonomia] = useState(false)
  const [nuevaClase, setNuevaClase] = useState({ codigo: '', nombre: '' })
  const [nuevaUbicacion, setNuevaUbicacion] = useState({ codigo: '', nombre: '', padre: '' })

  const [editando, setEditando] = useState<number | null>(null)
  const [form, setForm] = useState(ACTIVO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function cargarActivos() {
    api.get<Paginated<Activo>>('/assets/activos/').then((res) => setActivos(res.data.results))
  }
  function cargarClases() {
    api.get<Paginated<ClaseActivo>>('/assets/clases-activo/').then((res) => setClases(res.data.results))
  }
  function cargarUbicaciones() {
    api
      .get<Paginated<UbicacionTecnica>>('/assets/ubicaciones-tecnicas/')
      .then((res) => setUbicaciones(res.data.results))
  }

  useEffect(() => {
    cargarActivos()
    cargarClases()
    cargarUbicaciones()
  }, [])

  async function crearClase(e: FormEvent) {
    e.preventDefault()
    if (!nuevaClase.codigo || !nuevaClase.nombre) return
    await api.post('/assets/clases-activo/', nuevaClase)
    setNuevaClase({ codigo: '', nombre: '' })
    cargarClases()
  }

  async function crearUbicacion(e: FormEvent) {
    e.preventDefault()
    if (!nuevaUbicacion.codigo || !nuevaUbicacion.nombre) return
    await api.post('/assets/ubicaciones-tecnicas/', {
      codigo: nuevaUbicacion.codigo,
      nombre: nuevaUbicacion.nombre,
      padre: nuevaUbicacion.padre || null,
    })
    setNuevaUbicacion({ codigo: '', nombre: '', padre: '' })
    cargarUbicaciones()
  }

  function nuevoActivo() {
    setEditando(0)
    setForm(ACTIVO_VACIO)
    setError(null)
  }

  function editarActivo(a: Activo) {
    setEditando(a.id)
    setForm({
      codigo: a.codigo,
      nombre: a.nombre,
      clase: String(a.clase),
      ubicacion_tecnica: String(a.ubicacion_tecnica),
      sistema: a.sistema,
      criticidad: a.criticidad,
      fabricante: a.fabricante,
      modelo: a.modelo,
      numero_serie: a.numero_serie,
    })
    setError(null)
  }

  async function guardarActivo(e: FormEvent) {
    e.preventDefault()
    if (!form.codigo || !form.nombre || !form.clase || !form.ubicacion_tecnica) {
      setError('Código, nombre, clase y ubicación técnica son obligatorios.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      if (editando) {
        await api.patch(`/assets/activos/${editando}/`, form)
      } else {
        await api.post('/assets/activos/', form)
      }
      setEditando(null)
      cargarActivos()
    } catch (err) {
      const detalle = (err as { response?: { data?: unknown } })?.response?.data
      setError(typeof detalle === 'object' ? JSON.stringify(detalle) : 'No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Activos y estructura técnica</h1>
        {puedeGestionar && (
          <div className="flex gap-2">
            <button
              onClick={() => setMostrarTaxonomia((v) => !v)}
              className="text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md px-3 py-2"
            >
              {mostrarTaxonomia ? 'Ocultar clases/ubicaciones' : 'Clases y ubicaciones'}
            </button>
            <button
              onClick={nuevoActivo}
              className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
            >
              Nuevo activo
            </button>
          </div>
        )}
      </div>

      {mostrarTaxonomia && puedeGestionar && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Clases de activo</h2>
            <ul className="text-sm text-slate-600 space-y-1">
              {clases.map((c) => (
                <li key={c.id}>
                  {c.codigo} - {c.nombre}
                </li>
              ))}
              {clases.length === 0 && <li className="text-slate-400">Sin clases todavía.</li>}
            </ul>
            <form onSubmit={crearClase} className="flex gap-2">
              <input
                placeholder="Código"
                value={nuevaClase.codigo}
                onChange={(e) => setNuevaClase((f) => ({ ...f, codigo: e.target.value }))}
                className="w-24 rounded-md border border-slate-300 text-sm px-2 py-1"
              />
              <input
                placeholder="Nombre"
                value={nuevaClase.nombre}
                onChange={(e) => setNuevaClase((f) => ({ ...f, nombre: e.target.value }))}
                className="flex-1 rounded-md border border-slate-300 text-sm px-2 py-1"
              />
              <button className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-3">
                Agregar
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Ubicaciones técnicas</h2>
            <ul className="text-sm text-slate-600 space-y-1">
              {ubicaciones.map((u) => (
                <li key={u.id}>{u.ruta || `${u.codigo} - ${u.nombre}`}</li>
              ))}
              {ubicaciones.length === 0 && <li className="text-slate-400">Sin ubicaciones todavía.</li>}
            </ul>
            <form onSubmit={crearUbicacion} className="space-y-2">
              <div className="flex gap-2">
                <input
                  placeholder="Código"
                  value={nuevaUbicacion.codigo}
                  onChange={(e) => setNuevaUbicacion((f) => ({ ...f, codigo: e.target.value }))}
                  className="w-24 rounded-md border border-slate-300 text-sm px-2 py-1"
                />
                <input
                  placeholder="Nombre"
                  value={nuevaUbicacion.nombre}
                  onChange={(e) => setNuevaUbicacion((f) => ({ ...f, nombre: e.target.value }))}
                  className="flex-1 rounded-md border border-slate-300 text-sm px-2 py-1"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={nuevaUbicacion.padre}
                  onChange={(e) => setNuevaUbicacion((f) => ({ ...f, padre: e.target.value }))}
                  className="flex-1 rounded-md border border-slate-300 text-sm px-2 py-1"
                >
                  <option value="">Sin padre (nivel raíz, ej. planta)</option>
                  {ubicaciones.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.ruta || u.nombre}
                    </option>
                  ))}
                </select>
                <button className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-3">
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editando !== null && (
        <form
          onSubmit={guardarActivo}
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3"
        >
          <h2 className="text-sm font-semibold text-slate-700">
            {editando ? 'Editar activo' : 'Nuevo activo'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Código</label>
              <input
                required
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Clase</label>
              <select
                required
                value={form.clase}
                onChange={(e) => setForm((f) => ({ ...f, clase: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              >
                <option value="">Selecciona...</option>
                {clases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Ubicación técnica</label>
              <select
                required
                value={form.ubicacion_tecnica}
                onChange={(e) => setForm((f) => ({ ...f, ubicacion_tecnica: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              >
                <option value="">Selecciona...</option>
                {ubicaciones.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.ruta || u.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Criticidad</label>
              <select
                value={form.criticidad}
                onChange={(e) => setForm((f) => ({ ...f, criticidad: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              >
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sistema</label>
              <input
                value={form.sistema}
                onChange={(e) => setForm((f) => ({ ...f, sistema: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Fabricante</label>
              <input
                value={form.fabricante}
                onChange={(e) => setForm((f) => ({ ...f, fabricante: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Modelo</label>
              <input
                value={form.modelo}
                onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">N.º de serie</label>
              <input
                value={form.numero_serie}
                onChange={(e) => setForm((f) => ({ ...f, numero_serie: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={guardando}
              className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setEditando(null)}
              className="text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md px-4 py-2"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

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
              <th className="text-left px-4 py-2" />
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
                <td className="px-4 py-2">
                  {puedeGestionar && (
                    <button
                      onClick={() => editarActivo(a)}
                      className="text-xs font-medium text-slate-600 hover:underline"
                    >
                      Editar
                    </button>
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
