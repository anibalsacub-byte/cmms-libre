import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type {
  CausaFalla,
  MecanismoFalla,
  ModoFalla,
  Paginated,
  Sintoma,
} from '../types'
import { useAuth } from '../context/AuthContext'

const CATEGORIA_LABELS: Record<string, string> = {
  DISENO: 'Diseño',
  FABRICACION: 'Fabricación',
  INSTALACION: 'Instalación/montaje',
  OPERACION: 'Operación',
  MANTENIMIENTO: 'Mantenimiento',
  EXTERNA: 'Causa externa',
}

const CATEGORIA_OPCIONES = Object.entries(CATEGORIA_LABELS)

function detalleError(err: unknown, fallback: string) {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: Record<string, unknown> } }).response
    const data = response?.data
    if (!data) return fallback
    if (typeof data.detail === 'string') return data.detail
    const primerCampo = Object.values(data)[0]
    if (Array.isArray(primerCampo) && typeof primerCampo[0] === 'string') return primerCampo[0]
    if (typeof primerCampo === 'string') return primerCampo
    return fallback
  }
  return fallback
}

async function descargarCsv(recurso: string, archivo: string) {
  const res = await api.get(`${recurso}exportar-csv/`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([res.data]))
  const link = document.createElement('a')
  link.href = url
  link.download = archivo
  link.click()
  window.URL.revokeObjectURL(url)
}

type ConCodigo = { id: number; codigo?: string; nombre: string; categoria?: string }

function Seccion<T extends ConCodigo>({
  titulo,
  recurso,
  archivoCsv,
  tieneCodigo,
  tieneCategoria,
  items,
  onRecargar,
}: {
  titulo: string
  recurso: string
  archivoCsv: string
  tieneCodigo: boolean
  tieneCategoria: boolean
  items: T[]
  onRecargar: () => void
}) {
  const { esSuperusuario } = useAuth()
  const [editando, setEditando] = useState<number | 'nuevo' | null>(null)
  const [form, setForm] = useState({ codigo: '', nombre: '', categoria: 'OPERACION' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const [resultadoImport, setResultadoImport] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function nuevo() {
    setEditando('nuevo')
    setForm({ codigo: '', nombre: '', categoria: 'OPERACION' })
    setError(null)
  }

  function editar(item: T) {
    setEditando(item.id)
    setForm({ codigo: item.codigo ?? '', nombre: item.nombre, categoria: item.categoria ?? 'OPERACION' })
    setError(null)
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!form.nombre || (tieneCodigo && !form.codigo)) {
      setError('Faltan campos obligatorios.')
      return
    }
    setGuardando(true)
    setError(null)
    const payload: Record<string, unknown> = { nombre: form.nombre }
    if (tieneCodigo) payload.codigo = form.codigo
    if (tieneCategoria) payload.categoria = form.categoria
    try {
      if (editando === 'nuevo') {
        await api.post(recurso, payload)
      } else {
        await api.patch(`${recurso}${editando}/`, payload)
      }
      setEditando(null)
      onRecargar()
    } catch (err) {
      setError(detalleError(err, 'No se pudo guardar.'))
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(item: T) {
    if (!window.confirm(`¿Eliminar «${item.nombre}»? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`${recurso}${item.id}/`)
      onRecargar()
    } catch (err) {
      window.alert(detalleError(err, 'No se pudo eliminar (puede estar en uso).'))
    }
  }

  async function importarCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setImportando(true)
    setResultadoImport(null)
    try {
      const formData = new FormData()
      formData.append('archivo', archivo)
      const { data } = await api.post<{ creados: number; errores: { fila: number }[] }>(
        `${recurso}importar-csv/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      setResultadoImport(
        `${data.creados} registro(s) importado(s)` +
          (data.errores.length ? `, ${data.errores.length} fila(s) con error.` : '.'),
      )
      onRecargar()
    } catch (err) {
      setResultadoImport(detalleError(err, 'No se pudo importar el CSV.'))
    } finally {
      setImportando(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700">{titulo}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => descargarCsv(recurso, archivoCsv)}
            className="text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md px-2 py-1"
          >
            Exportar CSV
          </button>
          {esSuperusuario && (
            <>
              <label className="text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md px-2 py-1 cursor-pointer">
                {importando ? 'Importando...' : 'Importar CSV'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={importarCsv}
                  disabled={importando}
                  className="hidden"
                />
              </label>
              <button
                onClick={nuevo}
                className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-2 py-1"
              >
                Nuevo
              </button>
            </>
          )}
        </div>
      </div>

      {resultadoImport && (
        <p className="px-4 py-2 text-xs text-slate-500 border-b border-slate-100">{resultadoImport}</p>
      )}

      {editando !== null && (
        <form onSubmit={guardar} className="px-4 py-3 border-b border-slate-100 bg-slate-50 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {tieneCodigo && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Código</label>
                <input
                  value={form.codigo}
                  onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                />
              </div>
            )}
            <div className={tieneCodigo ? 'md:col-span-1' : 'md:col-span-2'}>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
              />
            </div>
            {tieneCategoria && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Categoría</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 text-sm px-2 py-1.5"
                >
                  {CATEGORIA_OPCIONES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={guardando}
              className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-3 py-1.5 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setEditando(null)}
              className="text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md px-3 py-1.5"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-2 text-sm flex items-center justify-between gap-2">
            <span>
              {item.codigo && <span className="font-mono text-xs text-slate-500 mr-2">{item.codigo}</span>}
              {item.nombre}
              {tieneCategoria && item.categoria && (
                <span className="ml-2 text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                  {CATEGORIA_LABELS[item.categoria] ?? item.categoria}
                </span>
              )}
            </span>
            {esSuperusuario && (
              <span className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => editar(item)}
                  className="text-xs font-medium text-slate-600 hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => eliminar(item)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </span>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">Sin registros.</p>}
      </div>
    </div>
  )
}

export default function FailureCatalog() {
  const { esSuperusuario } = useAuth()
  const [sintomas, setSintomas] = useState<Sintoma[]>([])
  const [modos, setModos] = useState<ModoFalla[]>([])
  const [mecanismos, setMecanismos] = useState<MecanismoFalla[]>([])
  const [causas, setCausas] = useState<CausaFalla[]>([])

  function cargarSintomas() {
    api.get<Paginated<Sintoma>>('/failures/sintomas/').then((r) => setSintomas(r.data.results))
  }
  function cargarModos() {
    api.get<Paginated<ModoFalla>>('/failures/modos-falla/').then((r) => setModos(r.data.results))
  }
  function cargarMecanismos() {
    api
      .get<Paginated<MecanismoFalla>>('/failures/mecanismos-falla/')
      .then((r) => setMecanismos(r.data.results))
  }
  function cargarCausas() {
    api.get<Paginated<CausaFalla>>('/failures/causas-falla/').then((r) => setCausas(r.data.results))
  }

  useEffect(() => {
    cargarSintomas()
    cargarModos()
    cargarMecanismos()
    cargarCausas()
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Catálogo de fallas (ISO 14224)</h1>
        <p className="text-sm text-slate-500">
          Taxonomía de síntomas, modos, mecanismos y causas de falla usada al registrar avisos y al
          cerrar órdenes de trabajo correctivas.
          {!esSuperusuario &&
            ' Es un catálogo compartido entre todas las empresas: solo el superusuario de la plataforma puede editarlo.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Seccion
          titulo="Síntomas"
          recurso="/failures/sintomas/"
          archivoCsv="sintomas.csv"
          tieneCodigo={false}
          tieneCategoria={false}
          items={sintomas}
          onRecargar={cargarSintomas}
        />
        <Seccion
          titulo="Modos de falla"
          recurso="/failures/modos-falla/"
          archivoCsv="modos_falla.csv"
          tieneCodigo
          tieneCategoria={false}
          items={modos}
          onRecargar={cargarModos}
        />
        <Seccion
          titulo="Mecanismos de falla"
          recurso="/failures/mecanismos-falla/"
          archivoCsv="mecanismos_falla.csv"
          tieneCodigo
          tieneCategoria={false}
          items={mecanismos}
          onRecargar={cargarMecanismos}
        />
        <Seccion
          titulo="Causas de falla"
          recurso="/failures/causas-falla/"
          archivoCsv="causas_falla.csv"
          tieneCodigo
          tieneCategoria
          items={causas}
          onRecargar={cargarCausas}
        />
      </div>
    </div>
  )
}
