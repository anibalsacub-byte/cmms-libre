import { useEffect, useState } from 'react'
import { registrarReportadorDeErrores } from '../api/client'

export default function ErrorBanner() {
  const [mensaje, setMensaje] = useState<string | null>(null)

  useEffect(() => {
    registrarReportadorDeErrores(setMensaje)
    return () => registrarReportadorDeErrores(null)
  }, [])

  if (!mensaje) return null

  return (
    <div className="bg-red-50 border-b border-red-200 text-red-700 text-sm px-4 py-2 flex items-center justify-between gap-3">
      <span>{mensaje}</span>
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={() => window.location.reload()} className="font-medium underline">
          Reintentar
        </button>
        <button onClick={() => setMensaje(null)} className="text-red-400 hover:text-red-600" aria-label="Cerrar aviso">
          ✕
        </button>
      </div>
    </div>
  )
}
