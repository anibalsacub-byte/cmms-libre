import { useRef, useState } from 'react'
import { api } from '../api/client'

function detalleError(err: unknown, fallback: string) {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const data = (err as { response?: { data?: Record<string, unknown> } }).response?.data
    if (!data) return fallback
    if (typeof data.detail === 'string') return data.detail
    return fallback
  }
  return fallback
}

async function descargar(url: string, archivo: string) {
  const res = await api.get(url, { responseType: 'blob' })
  const link = document.createElement('a')
  link.href = window.URL.createObjectURL(new Blob([res.data]))
  link.download = archivo
  link.click()
  window.URL.revokeObjectURL(link.href)
}

type ResultadoImport = { creados: number; errores: { fila: number; errores: unknown }[] }

export default function ImportarExportarCsv({
  recurso,
  nombreArchivo,
  onImportado,
}: {
  /** Ruta base del recurso, ej. '/assets/activos/' (con slash final). */
  recurso: string
  /** Nombre base para los archivos descargados, ej. 'activos'. */
  nombreArchivo: string
  onImportado?: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoImport | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function importar(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setImportando(true)
    setError(null)
    setResultado(null)
    try {
      const formData = new FormData()
      formData.append('archivo', archivo)
      const { data } = await api.post<ResultadoImport>(`${recurso}importar-csv/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResultado(data)
      if (data.creados > 0) onImportado?.()
    } catch (err) {
      setError(detalleError(err, 'No se pudo importar el archivo.'))
    } finally {
      setImportando(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-2">
      <h2 className="text-sm font-semibold text-slate-700">Importar / exportar CSV</h2>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => descargar(`${recurso}plantilla-csv/`, `plantilla_${nombreArchivo}.csv`)}
          className="text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md px-2 py-1.5"
        >
          Descargar plantilla
        </button>
        <button
          onClick={() => descargar(`${recurso}exportar-csv/`, `${nombreArchivo}.csv`)}
          className="text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md px-2 py-1.5"
        >
          Exportar CSV
        </button>
        <label className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md px-3 py-1.5 cursor-pointer">
          {importando ? 'Importando...' : 'Importar CSV'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={importar}
            disabled={importando}
            className="hidden"
          />
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {resultado && (
        <div className="text-xs text-slate-600">
          <p>
            <span className="font-medium text-emerald-700">{resultado.creados} registro(s)</span>{' '}
            importado(s) correctamente.
            {resultado.errores.length > 0 && (
              <span className="text-red-600"> {resultado.errores.length} fila(s) con error:</span>
            )}
          </p>
          {resultado.errores.length > 0 && (
            <ul className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
              {resultado.errores.map((e, i) => (
                <li key={i}>
                  Fila {e.fila}: {JSON.stringify(e.errores)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
