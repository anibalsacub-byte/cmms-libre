import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Ausencia, OrdenTrabajo, Paginated, PlanificacionSemana, Tecnico } from '../types'
import { useAuth } from '../context/AuthContext'

const DIA_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const TIPO_AUSENCIA_LABELS: Record<string, string> = {
  VACACIONES: 'Vacaciones',
  LICENCIA: 'Licencia / permiso',
  INCAPACIDAD: 'Incapacidad médica',
  OTRO: 'Otro',
}

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

function inicioDeSemana(fecha: Date) {
  const copia = new Date(fecha)
  const dia = (copia.getDay() + 6) % 7 // lunes = 0
  copia.setDate(copia.getDate() - dia)
  copia.setHours(0, 0, 0, 0)
  return copia
}

function formatearFecha(fecha: Date) {
  return fecha.toISOString().slice(0, 10)
}

export default function Scheduling() {
  const { puedeGestionar } = useAuth()
  const [inicioSemana, setInicioSemana] = useState(() => inicioDeSemana(new Date()))
  const [semana, setSemana] = useState<PlanificacionSemana | null>(null)
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([])
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [ausencias, setAusencias] = useState<Ausencia[]>([])
  const [arrastrandoId, setArrastrandoId] = useState<number | null>(null)

  const [formAsignar, setFormAsignar] = useState({ orden_trabajo: '', tecnico: '', fecha: '', horas_planificadas: '' })
  const [mostrarAsignar, setMostrarAsignar] = useState(false)
  const [errorAsignar, setErrorAsignar] = useState<string | null>(null)

  const [mostrarAusencia, setMostrarAusencia] = useState(false)
  const [formAusencia, setFormAusencia] = useState({
    tecnico: '',
    fecha_inicio: '',
    fecha_fin: '',
    tipo: 'VACACIONES',
    motivo: '',
  })
  const [errorAusencia, setErrorAusencia] = useState<string | null>(null)

  const cargarSemana = useCallback(() => {
    api
      .get<PlanificacionSemana>(
        `/workorders/planificacion/semana/?fecha_inicio=${formatearFecha(inicioSemana)}`,
      )
      .then((res) => setSemana(res.data))
  }, [inicioSemana])

  useEffect(cargarSemana, [cargarSemana])

  useEffect(() => {
    api.get<Paginated<OrdenTrabajo>>('/workorders/ordenes/').then((res) => setOrdenes(res.data.results))
    api.get<Paginated<Tecnico>>('/hr/tecnicos/?activo=true').then((res) => setTecnicos(res.data.results))
    cargarAusencias()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cargarAusencias() {
    api.get<Paginated<Ausencia>>('/hr/ausencias/').then((res) => setAusencias(res.data.results))
  }

  const ordenesBacklog = useMemo(
    () => ordenes.filter((o) => !['CERRADA', 'CANCELADA'].includes(o.estado)),
    [ordenes],
  )

  async function asignar(e: FormEvent) {
    e.preventDefault()
    if (!formAsignar.orden_trabajo || !formAsignar.tecnico || !formAsignar.fecha || !formAsignar.horas_planificadas) {
      setErrorAsignar('Completa orden, técnico, fecha y horas.')
      return
    }
    try {
      await api.post('/workorders/asignaciones/', {
        orden_trabajo: Number(formAsignar.orden_trabajo),
        tecnico: Number(formAsignar.tecnico),
        fecha: formAsignar.fecha,
        horas_planificadas: formAsignar.horas_planificadas,
      })
      setFormAsignar({ orden_trabajo: '', tecnico: '', fecha: '', horas_planificadas: '' })
      setMostrarAsignar(false)
      setErrorAsignar(null)
      cargarSemana()
    } catch (err) {
      setErrorAsignar(detalleError(err, 'No se pudo asignar.'))
    }
  }

  async function reprogramar(asignacionId: number, nuevaFecha: string, nuevoTecnico: number) {
    try {
      await api.patch(`/workorders/asignaciones/${asignacionId}/`, {
        fecha: nuevaFecha,
        tecnico: nuevoTecnico,
      })
      cargarSemana()
    } catch (err) {
      window.alert(detalleError(err, 'No se pudo reprogramar (¿la OT ya está cerrada?).'))
    }
  }

  async function guardarAusencia(e: FormEvent) {
    e.preventDefault()
    if (!formAusencia.tecnico || !formAusencia.fecha_inicio || !formAusencia.fecha_fin) {
      setErrorAusencia('Técnico, fecha de inicio y fecha de fin son obligatorios.')
      return
    }
    try {
      await api.post('/hr/ausencias/', {
        tecnico: Number(formAusencia.tecnico),
        fecha_inicio: formAusencia.fecha_inicio,
        fecha_fin: formAusencia.fecha_fin,
        tipo: formAusencia.tipo,
        motivo: formAusencia.motivo,
      })
      setFormAusencia({ tecnico: '', fecha_inicio: '', fecha_fin: '', tipo: 'VACACIONES', motivo: '' })
      setMostrarAusencia(false)
      setErrorAusencia(null)
      cargarAusencias()
      cargarSemana()
    } catch (err) {
      setErrorAusencia(detalleError(err, 'No se pudo registrar la ausencia.'))
    }
  }

  async function eliminarAusencia(id: number) {
    if (!window.confirm('¿Eliminar esta ausencia?')) return
    await api.delete(`/hr/ausencias/${id}/`)
    cargarAusencias()
    cargarSemana()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-800">Planificación y carga de trabajo</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setInicioSemana((f) => new Date(f.getTime() - 7 * 86400000))}
            className="rounded-md border border-slate-300 text-sm px-3 py-1.5 bg-white hover:bg-slate-50"
          >
            ← Semana anterior
          </button>
          <span className="text-sm text-slate-600">
            {semana ? `${semana.dias[0]} – ${semana.dias[6]}` : '...'}
          </span>
          <button
            onClick={() => setInicioSemana((f) => new Date(f.getTime() + 7 * 86400000))}
            className="rounded-md border border-slate-300 text-sm px-3 py-1.5 bg-white hover:bg-slate-50"
          >
            Semana siguiente →
          </button>
        </div>
      </div>

      {semana && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Horas pendientes</p>
            <p className="text-2xl font-semibold text-slate-800 mt-1">{semana.horas_pendientes} h</p>
            <p className="text-xs text-slate-500 mt-1">Planificadas y sin ejecutar, en OT abiertas</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Capacidad semanal del equipo</p>
            <p className="text-2xl font-semibold text-slate-800 mt-1">
              {semana.capacidad_semanal_total_horas} h
            </p>
            <p className="text-xs text-slate-500 mt-1">Técnicos activos y disponibles × 5 días</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Backlog en semanas</p>
            <p className="text-2xl font-semibold text-slate-800 mt-1">
              {semana.backlog_semanas === null ? 'Sin capacidad' : `${semana.backlog_semanas} sem.`}
            </p>
            <p className="text-xs text-slate-500 mt-1">Horas pendientes ÷ capacidad semanal</p>
          </div>
        </div>
      )}

      {puedeGestionar && (
        <div className="flex gap-2">
          <button
            onClick={() => setMostrarAsignar((v) => !v)}
            className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
          >
            {mostrarAsignar ? 'Cancelar' : 'Asignar OT a técnico'}
          </button>
          <button
            onClick={() => setMostrarAusencia((v) => !v)}
            className="text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md px-4 py-2"
          >
            {mostrarAusencia ? 'Cancelar' : 'Registrar ausencia'}
          </button>
        </div>
      )}

      {mostrarAsignar && (
        <form onSubmit={asignar} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Orden de trabajo</label>
              <select
                value={formAsignar.orden_trabajo}
                onChange={(e) => setFormAsignar((f) => ({ ...f, orden_trabajo: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              >
                <option value="">Selecciona...</option>
                {ordenesBacklog.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.numero} - {o.activo_codigo} - {o.descripcion}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Técnico</label>
              <select
                value={formAsignar.tecnico}
                onChange={(e) => setFormAsignar((f) => ({ ...f, tecnico: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              >
                <option value="">Selecciona...</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.codigo} - {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Fecha</label>
              <input
                type="date"
                value={formAsignar.fecha}
                onChange={(e) => setFormAsignar((f) => ({ ...f, fecha: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Horas planificadas</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formAsignar.horas_planificadas}
                onChange={(e) => setFormAsignar((f) => ({ ...f, horas_planificadas: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
          </div>
          {errorAsignar && <p className="text-sm text-red-600">{errorAsignar}</p>}
          <button
            type="submit"
            className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
          >
            Guardar asignación
          </button>
        </form>
      )}

      {mostrarAusencia && (
        <form onSubmit={guardarAusencia} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Técnico</label>
              <select
                value={formAusencia.tecnico}
                onChange={(e) => setFormAusencia((f) => ({ ...f, tecnico: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              >
                <option value="">Selecciona...</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.codigo} - {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
              <input
                type="date"
                value={formAusencia.fecha_inicio}
                onChange={(e) => setFormAusencia((f) => ({ ...f, fecha_inicio: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
              <input
                type="date"
                value={formAusencia.fecha_fin}
                onChange={(e) => setFormAusencia((f) => ({ ...f, fecha_fin: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
              <select
                value={formAusencia.tipo}
                onChange={(e) => setFormAusencia((f) => ({ ...f, tipo: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              >
                {Object.entries(TIPO_AUSENCIA_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Motivo (opcional)</label>
              <input
                value={formAusencia.motivo}
                onChange={(e) => setFormAusencia((f) => ({ ...f, motivo: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
          </div>
          {errorAusencia && <p className="text-sm text-red-600">{errorAusencia}</p>}
          <button
            type="submit"
            className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
          >
            Guardar ausencia
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="border border-slate-300 px-2 py-1.5 text-left w-40">Técnico</th>
              {semana?.dias.map((dia, i) => (
                <th key={dia} className="border border-slate-300 px-2 py-1.5 text-left w-32">
                  {DIA_LABELS[i]} {dia.slice(5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {semana?.tecnicos.map((tecnico) => (
              <tr key={tecnico.id}>
                <td className="border border-slate-300 px-2 py-1.5 align-top font-medium text-slate-700">
                  {tecnico.codigo}
                  <div className="text-slate-500 font-normal">{tecnico.nombre}</div>
                  <div className="text-slate-400 font-normal">{tecnico.capacidad_diaria_horas} h/día</div>
                </td>
                {semana.dias.map((dia) => {
                  const info = tecnico.dias[dia]
                  const hayConflicto = info.ausente && info.asignaciones.length > 0
                  return (
                    <td
                      key={dia}
                      className={`border border-slate-300 px-2 py-1.5 align-top ${
                        hayConflicto || info.sobrecarga
                          ? 'bg-red-50'
                          : info.ausente
                            ? 'bg-slate-100'
                            : ''
                      }`}
                      onDragOver={(e) => puedeGestionar && e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        if (!puedeGestionar || arrastrandoId === null) return
                        reprogramar(arrastrandoId, dia, tecnico.id)
                        setArrastrandoId(null)
                      }}
                    >
                      {info.ausente && (
                        <div className={`text-xs font-medium mb-1 ${hayConflicto ? 'text-red-700' : 'text-slate-500'}`}>
                          Ausente{hayConflicto && ' ⚠ tiene OT asignada'}
                        </div>
                      )}
                      {(!info.ausente || hayConflicto) && (
                        <>
                          <div
                            className={`text-xs font-medium mb-1 ${
                              info.sobrecarga ? 'text-red-700' : 'text-slate-500'
                            }`}
                          >
                            {info.horas_planificadas}/{tecnico.capacidad_diaria_horas} h
                            {info.sobrecarga && ' ⚠ sobrecarga'}
                          </div>
                          <div className="space-y-1">
                            {info.asignaciones.map((a) => (
                              <div
                                key={a.id}
                                draggable={puedeGestionar}
                                onDragStart={() => setArrastrandoId(a.id)}
                                onDragEnd={() => setArrastrandoId(null)}
                                title={a.descripcion}
                                className={`rounded px-1.5 py-1 bg-white border border-slate-300 ${
                                  puedeGestionar ? 'cursor-move' : ''
                                }`}
                              >
                                <div className="font-medium text-slate-700">
                                  {a.orden_trabajo_numero} ({a.activo_codigo})
                                </div>
                                <div className="text-slate-500 truncate">{a.horas_planificadas} h</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {semana && semana.tecnicos.length === 0 && (
              <tr>
                <td colSpan={8} className="border border-slate-300 px-2 py-4 text-center text-slate-500">
                  Sin técnicos activos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Ausencias registradas</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {ausencias.map((a) => (
            <div key={a.id} className="px-4 py-2 text-sm flex items-center justify-between gap-2">
              <span>
                <span className="font-medium text-slate-700">
                  {a.tecnico_codigo} - {a.tecnico_nombre}
                </span>{' '}
                <span className="text-slate-500">
                  {a.fecha_inicio} a {a.fecha_fin} ({TIPO_AUSENCIA_LABELS[a.tipo] ?? a.tipo})
                  {a.motivo && ` — ${a.motivo}`}
                </span>
              </span>
              {puedeGestionar && (
                <button
                  onClick={() => eliminarAusencia(a.id)}
                  className="text-xs font-medium text-red-600 hover:underline shrink-0"
                >
                  Eliminar
                </button>
              )}
            </div>
          ))}
          {ausencias.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-500">Sin ausencias registradas.</p>
          )}
        </div>
      </div>
    </div>
  )
}
