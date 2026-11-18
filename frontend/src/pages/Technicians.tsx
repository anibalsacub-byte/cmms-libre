import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Paginated, Tecnico } from '../types'
import { useAuth } from '../context/AuthContext'

type Especialidad = { id: number; nombre: string }
type Habilidad = { id: number; nombre: string }

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

const TECNICO_VACIO = {
  codigo: '',
  nombre: '',
  especialidad: '',
  habilidades: [] as number[],
  tarifa_hora: '',
  productividad_pct: '100',
  capacidad_diaria_horas: '8',
  disponible: true,
  activo: true,
}

export default function Technicians() {
  const { puedeGestionar, esAdministrador } = useAuth()
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [habilidades, setHabilidades] = useState<Habilidad[]>([])

  const [editando, setEditando] = useState<number | null>(null)
  const [form, setForm] = useState(TECNICO_VACIO)
  const [error, setError] = useState<string | null>(null)

  function cargarTecnicos() {
    api.get<Paginated<Tecnico>>('/hr/tecnicos/').then((res) => setTecnicos(res.data.results))
  }

  useEffect(() => {
    cargarTecnicos()
    api.get<Paginated<Especialidad>>('/hr/especialidades/').then((res) => setEspecialidades(res.data.results))
    api.get<Paginated<Habilidad>>('/hr/habilidades/').then((res) => setHabilidades(res.data.results))
  }, [])

  function nuevoTecnico() {
    setEditando(0)
    setForm(TECNICO_VACIO)
    setError(null)
  }

  function editarTecnico(t: Tecnico) {
    setEditando(t.id)
    setForm({
      codigo: t.codigo,
      nombre: t.nombre,
      especialidad: String(t.especialidad),
      habilidades: t.habilidades,
      tarifa_hora: t.tarifa_hora,
      productividad_pct: t.productividad_pct,
      capacidad_diaria_horas: t.capacidad_diaria_horas,
      disponible: t.disponible,
      activo: t.activo,
    })
    setError(null)
  }

  function alternarHabilidad(id: number) {
    setForm((f) => ({
      ...f,
      habilidades: f.habilidades.includes(id)
        ? f.habilidades.filter((h) => h !== id)
        : [...f.habilidades, id],
    }))
  }

  async function guardarTecnico(e: FormEvent) {
    e.preventDefault()
    if (!form.codigo || !form.nombre || !form.especialidad) {
      setError('Código, nombre y especialidad son obligatorios.')
      return
    }
    setError(null)
    try {
      const payload = {
        ...form,
        especialidad: Number(form.especialidad),
        tarifa_hora: form.tarifa_hora || '0',
        productividad_pct: form.productividad_pct || '100',
        capacidad_diaria_horas: form.capacidad_diaria_horas || '8',
      }
      if (editando) {
        await api.patch(`/hr/tecnicos/${editando}/`, payload)
      } else {
        await api.post('/hr/tecnicos/', payload)
      }
      setEditando(null)
      cargarTecnicos()
    } catch (err) {
      setError(detalleError(err, 'No se pudo guardar el técnico.'))
    }
  }

  async function eliminarTecnico(t: Tecnico) {
    if (!window.confirm(`¿Está seguro que desea eliminar "${t.codigo} - ${t.nombre}"?`)) return
    try {
      await api.delete(`/hr/tecnicos/${t.id}/`)
      cargarTecnicos()
    } catch (err) {
      window.alert(detalleError(err, 'No se pudo eliminar.'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Técnicos</h1>
        {puedeGestionar && (
          <button
            onClick={nuevoTecnico}
            className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
          >
            Nuevo técnico
          </button>
        )}
      </div>

      {editando !== null && (
        <form
          onSubmit={guardarTecnico}
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3"
        >
          <h2 className="text-sm font-semibold text-slate-700">
            {editando ? 'Editar técnico' : 'Nuevo técnico'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              <label className="block text-xs font-medium text-slate-500 mb-1">Especialidad</label>
              <select
                required
                value={form.especialidad}
                onChange={(e) => setForm((f) => ({ ...f, especialidad: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              >
                <option value="">Selecciona...</option>
                {especialidades.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tarifa/h (S/)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.tarifa_hora}
                onChange={(e) => setForm((f) => ({ ...f, tarifa_hora: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Productividad %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="200"
                value={form.productividad_pct}
                onChange={(e) => setForm((f) => ({ ...f, productividad_pct: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Capacidad diaria (h)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.capacidad_diaria_horas}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacidad_diaria_horas: e.target.value }))
                }
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-1.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.disponible}
                  onChange={(e) => setForm((f) => ({ ...f, disponible: e.target.checked }))}
                />
                Disponible
              </label>
              <label className="flex items-center gap-1.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                />
                Activo
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Habilidades</label>
            <div className="flex flex-wrap gap-3">
              {habilidades.map((h) => (
                <label key={h.id} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.habilidades.includes(h.id)}
                    onChange={() => alternarHabilidad(h.id)}
                  />
                  {h.nombre}
                </label>
              ))}
              {habilidades.length === 0 && (
                <span className="text-sm text-slate-500">Sin habilidades en el catálogo.</span>
              )}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
            >
              Guardar
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
              <th className="text-left px-4 py-2">Especialidad</th>
              <th className="text-left px-4 py-2">Habilidades</th>
              <th className="text-left px-4 py-2">Tarifa/h</th>
              <th className="text-left px-4 py-2">Productividad</th>
              <th className="text-left px-4 py-2">Disponible</th>
              <th className="text-left px-4 py-2">Activo</th>
              {puedeGestionar && <th className="text-left px-4 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tecnicos.map((t) => (
              <tr key={t.id} className={t.activo ? 'hover:bg-slate-50' : 'opacity-50'}>
                <td className="px-4 py-2 font-medium text-slate-700">{t.codigo}</td>
                <td className="px-4 py-2">{t.nombre}</td>
                <td className="px-4 py-2 text-slate-500">{t.especialidad_nombre}</td>
                <td className="px-4 py-2 text-slate-500">{t.habilidades_nombres.join(', ') || '—'}</td>
                <td className="px-4 py-2 text-slate-500">S/ {t.tarifa_hora}</td>
                <td className="px-4 py-2 text-slate-500">{t.productividad_pct}%</td>
                <td className="px-4 py-2">
                  {t.disponible ? (
                    <span className="text-emerald-600 text-xs font-medium">Sí</span>
                  ) : (
                    <span className="text-slate-500 text-xs font-medium">No</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {t.activo ? (
                    <span className="text-emerald-600 text-xs font-medium">Sí</span>
                  ) : (
                    <span className="text-slate-500 text-xs font-medium">No</span>
                  )}
                </td>
                {puedeGestionar && (
                  <td className="px-4 py-2 space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => editarTecnico(t)}
                      className="text-xs font-medium text-slate-600 hover:underline"
                    >
                      Editar
                    </button>
                    {esAdministrador && (
                      <button
                        onClick={() => eliminarTecnico(t)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {tecnicos.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                  Sin técnicos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
