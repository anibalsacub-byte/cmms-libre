import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Activo, Aviso, Paginated } from '../types'
import Badge from '../components/Badge'
import { useAuth } from '../context/AuthContext'

const ESTADO_COLORS: Record<string, string> = {
  ABIERTO: 'bg-amber-100 text-amber-700',
  EN_EVALUACION: 'bg-blue-100 text-blue-700',
  CONVERTIDO_OT: 'bg-emerald-100 text-emerald-700',
  RECHAZADO: 'bg-slate-200 text-slate-600',
  CERRADO: 'bg-slate-100 text-slate-500',
}

export default function Notices() {
  const { me, puedeOperar } = useAuth()
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [activos, setActivos] = useState<Activo[]>([])
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [form, setForm] = useState({ activo: '', descripcion: '', prioridad: 'MEDIA' })

  function load() {
    api.get<Paginated<Aviso>>('/notices/avisos/').then((res) => setAvisos(res.data.results))
  }

  useEffect(load, [])
  useEffect(() => {
    api.get<Paginated<Activo>>('/assets/activos/').then((res) => setActivos(res.data.results))
  }, [])

  async function convertir(aviso: Aviso) {
    setLoadingId(aviso.id)
    try {
      await api.post(`/notices/avisos/${aviso.id}/convertir-a-ot/`, {})
      load()
    } finally {
      setLoadingId(null)
    }
  }

  async function crearAviso(e: FormEvent) {
    e.preventDefault()
    if (!form.activo || !form.descripcion) return
    setEnviando(true)
    try {
      await api.post('/notices/avisos/', {
        activo: Number(form.activo),
        descripcion: form.descripcion,
        prioridad: form.prioridad,
        reportado_por: me?.username ?? 'Usuario',
      })
      setForm({ activo: '', descripcion: '', prioridad: 'MEDIA' })
      setMostrarForm(false)
      load()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Avisos de mantenimiento</h1>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2"
        >
          {mostrarForm ? 'Cancelar' : 'Nuevo aviso'}
        </button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={crearAviso}
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3"
        >
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Activo</label>
            <select
              required
              value={form.activo}
              onChange={(e) => setForm((f) => ({ ...f, activo: e.target.value }))}
              className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
            >
              <option value="">Selecciona un activo...</option>
              {activos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codigo} - {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
            <textarea
              required
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              rows={3}
              placeholder="¿Qué problema observaste?"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Prioridad</label>
            <select
              value={form.prioridad}
              onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value }))}
              className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
            >
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-4 py-2 disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : 'Reportar aviso'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Número</th>
              <th className="text-left px-4 py-2">Activo</th>
              <th className="text-left px-4 py-2">Descripción</th>
              <th className="text-left px-4 py-2">Prioridad</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-left px-4 py-2">Reportado por</th>
              <th className="text-left px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {avisos.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-700">{a.numero}</td>
                <td className="px-4 py-2">
                  {a.activo_codigo} - {a.activo_nombre}
                </td>
                <td className="px-4 py-2 max-w-xs truncate" title={a.descripcion}>
                  {a.descripcion}
                </td>
                <td className="px-4 py-2">
                  <Badge value={a.prioridad} />
                </td>
                <td className="px-4 py-2">
                  <Badge value={a.estado} map={ESTADO_COLORS} />
                </td>
                <td className="px-4 py-2 text-slate-500">{a.reportado_por}</td>
                <td className="px-4 py-2">
                  {puedeOperar && (a.estado === 'ABIERTO' || a.estado === 'EN_EVALUACION') ? (
                    <button
                      onClick={() => convertir(a)}
                      disabled={loadingId === a.id}
                      className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-3 py-1 disabled:opacity-50"
                    >
                      {loadingId === a.id ? 'Creando OT...' : 'Convertir a OT'}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {avisos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Sin avisos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
