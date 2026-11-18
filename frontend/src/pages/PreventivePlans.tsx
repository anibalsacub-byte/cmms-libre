import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Activo, Paginated, PlanPreventivo } from '../types'
import { useAuth } from '../context/AuthContext'

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

const PLAN_VACIO = {
  activo: '',
  nombre: '',
  descripcion: '',
  tareas_plantilla: '',
  tipo: 'CALENDARIO' as 'CALENDARIO' | 'HOROMETRO',
  frecuencia_dias: '',
  frecuencia_horas: '',
  dias_anticipacion: '0',
  fecha_proxima: '',
  horometro_proximo: '',
}

export default function PreventivePlans() {
  const { puedeGestionar, esAdministrador } = useAuth()
  const [planes, setPlanes] = useState<PlanPreventivo[]>([])
  const [activos, setActivos] = useState<Activo[]>([])
  const [generando, setGenerando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const [editando, setEditando] = useState<number | null>(null)
  const [form, setForm] = useState(PLAN_VACIO)
  const [error, setError] = useState<string | null>(null)

  function load() {
    api.get<Paginated<PlanPreventivo>>('/pm-plans/planes/').then((res) => setPlanes(res.data.results))
  }

  useEffect(() => {
    load()
    api.get<Paginated<Activo>>('/assets/activos/').then((res) => setActivos(res.data.results))
  }, [])

  async function generarOrdenes() {
    setGenerando(true)
    setMensaje(null)
    try {
      const { data } = await api.post('/pm-plans/planes/generar-ordenes/', {})
      setMensaje(
        data.generadas > 0
          ? `Se generaron ${data.generadas} orden(es) de trabajo preventivas.`
          : 'No hay planes vencidos por ahora.',
      )
      load()
    } finally {
      setGenerando(false)
    }
  }

  function nuevoPlan() {
    setEditando(0)
    setForm(PLAN_VACIO)
    setError(null)
  }

  function editarPlan(p: PlanPreventivo) {
    setEditando(p.id)
    setForm({
      activo: String(p.activo),
      nombre: p.nombre,
      descripcion: p.descripcion,
      tareas_plantilla: p.tareas_plantilla,
      tipo: p.tipo,
      frecuencia_dias: p.frecuencia_dias != null ? String(p.frecuencia_dias) : '',
      frecuencia_horas: p.frecuencia_horas ?? '',
      dias_anticipacion: String(p.dias_anticipacion),
      fecha_proxima: p.fecha_proxima ?? '',
      horometro_proximo: p.horometro_proximo ?? '',
    })
    setError(null)
  }

  async function guardarPlan(e: FormEvent) {
    e.preventDefault()
    if (!form.activo || !form.nombre) {
      setError('Activo y nombre son obligatorios.')
      return
    }
    if (form.tipo === 'CALENDARIO' && (!form.frecuencia_dias || !form.fecha_proxima)) {
      setError('Para un plan por calendario, frecuencia (días) y próximo vencimiento son obligatorios.')
      return
    }
    if (form.tipo === 'HOROMETRO' && (!form.frecuencia_horas || !form.horometro_proximo)) {
      setError('Para un plan por horómetro, frecuencia (horas) y próximo horómetro son obligatorios.')
      return
    }
    setError(null)
    try {
      const payload = {
        activo: Number(form.activo),
        nombre: form.nombre,
        descripcion: form.descripcion,
        tareas_plantilla: form.tareas_plantilla,
        tipo: form.tipo,
        dias_anticipacion: Number(form.dias_anticipacion || 0),
        frecuencia_dias: form.tipo === 'CALENDARIO' ? Number(form.frecuencia_dias) : null,
        fecha_proxima: form.tipo === 'CALENDARIO' ? form.fecha_proxima : null,
        frecuencia_horas: form.tipo === 'HOROMETRO' ? form.frecuencia_horas : null,
        horometro_proximo: form.tipo === 'HOROMETRO' ? form.horometro_proximo : null,
      }
      if (editando) {
        await api.patch(`/pm-plans/planes/${editando}/`, payload)
      } else {
        await api.post('/pm-plans/planes/', payload)
      }
      setEditando(null)
      load()
    } catch (err) {
      setError(detalleError(err, 'No se pudo guardar el plan.'))
    }
  }

  async function alternarActivo(p: PlanPreventivo) {
    try {
      await api.patch(`/pm-plans/planes/${p.id}/`, { activo_flag: !p.activo_flag })
      load()
    } catch (err) {
      window.alert(detalleError(err, 'No se pudo actualizar el plan.'))
    }
  }

  async function eliminarPlan(p: PlanPreventivo) {
    if (!window.confirm(`¿Está seguro que desea eliminar el plan "${p.nombre}"?`)) return
    try {
      await api.delete(`/pm-plans/planes/${p.id}/`)
      load()
    } catch (err) {
      window.alert(detalleError(err, 'No se pudo eliminar.'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Planes de mantenimiento preventivo</h1>
          <p className="text-sm text-slate-500">
            Por calendario o por horómetro; generan una OT preventiva automáticamente al vencer.
          </p>
        </div>
        {puedeGestionar && (
          <div className="flex gap-2">
            <button
              onClick={nuevoPlan}
              className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
            >
              Nuevo plan
            </button>
            <button
              onClick={generarOrdenes}
              disabled={generando}
              className="text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md px-4 py-2 disabled:opacity-50"
            >
              {generando ? 'Generando...' : 'Generar órdenes pendientes'}
            </button>
          </div>
        )}
      </div>

      {mensaje && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 text-sm">
          {mensaje}
        </div>
      )}

      {editando !== null && (
        <form
          onSubmit={guardarPlan}
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3"
        >
          <h2 className="text-sm font-semibold text-slate-700">
            {editando ? 'Editar plan' : 'Nuevo plan'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Activo</label>
              <select
                required
                value={form.activo}
                onChange={(e) => setForm((f) => ({ ...f, activo: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              >
                <option value="">Selecciona...</option>
                {activos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.codigo} - {a.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Nombre del plan</label>
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Lubricación mensual"
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div className="col-span-2 md:col-span-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
              <input
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div className="col-span-2 md:col-span-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Tareas (una por línea, se copian a la OT generada)
              </label>
              <textarea
                rows={3}
                value={form.tareas_plantilla}
                onChange={(e) => setForm((f) => ({ ...f, tareas_plantilla: e.target.value }))}
                placeholder={'Revisar nivel de aceite\nLimpiar filtro\nVerificar ruidos anormales'}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipo: e.target.value as 'CALENDARIO' | 'HOROMETRO' }))
                }
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              >
                <option value="CALENDARIO">Por calendario</option>
                <option value="HOROMETRO">Por horómetro</option>
              </select>
            </div>
            {form.tipo === 'CALENDARIO' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Frecuencia (días)
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.frecuencia_dias}
                    onChange={(e) => setForm((f) => ({ ...f, frecuencia_dias: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Próximo vencimiento
                  </label>
                  <input
                    required
                    type="date"
                    value={form.fecha_proxima}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_proxima: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Frecuencia (horas)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.frecuencia_horas}
                    onChange={(e) => setForm((f) => ({ ...f, frecuencia_horas: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Próximo horómetro
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.horometro_proximo}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, horometro_proximo: e.target.value }))
                    }
                    className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Anticipación (días)
              </label>
              <input
                type="number"
                min="0"
                value={form.dias_anticipacion}
                onChange={(e) => setForm((f) => ({ ...f, dias_anticipacion: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
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
              <th className="text-left px-4 py-2">Plan</th>
              <th className="text-left px-4 py-2">Activo</th>
              <th className="text-left px-4 py-2">Tipo</th>
              <th className="text-left px-4 py-2">Próximo vencimiento</th>
              <th className="text-left px-4 py-2">Última generación</th>
              <th className="text-left px-4 py-2">Estado</th>
              {puedeGestionar && <th className="text-left px-4 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {planes.map((p) => (
              <tr key={p.id} className={p.vencido ? 'bg-amber-50' : 'hover:bg-slate-50'}>
                <td className="px-4 py-2 font-medium text-slate-700">{p.nombre}</td>
                <td className="px-4 py-2">{p.activo_codigo}</td>
                <td className="px-4 py-2 text-slate-500">
                  {p.tipo === 'CALENDARIO' ? 'Calendario' : 'Horómetro'}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {p.tipo === 'CALENDARIO' ? p.fecha_proxima : `${p.horometro_proximo} h`}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {p.ultima_generacion ? new Date(p.ultima_generacion).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-2">
                  {!p.activo_flag ? (
                    <span className="text-xs text-slate-500">Pausado</span>
                  ) : p.vencido ? (
                    <span className="text-xs font-medium text-amber-700">Vencido</span>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600">Al día</span>
                  )}
                </td>
                {puedeGestionar && (
                  <td className="px-4 py-2 space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => editarPlan(p)}
                      className="text-xs font-medium text-slate-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => alternarActivo(p)}
                      className="text-xs font-medium text-slate-600 hover:underline"
                    >
                      {p.activo_flag ? 'Pausar' : 'Activar'}
                    </button>
                    {esAdministrador && (
                      <button
                        onClick={() => eliminarPlan(p)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {planes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Sin planes preventivos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
