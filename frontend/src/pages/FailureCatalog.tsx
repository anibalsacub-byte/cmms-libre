import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type {
  CausaFalla,
  MecanismoFalla,
  ModoFalla,
  Paginated,
  Sintoma,
} from '../types'

const CATEGORIA_LABELS: Record<string, string> = {
  DISENO: 'Diseño',
  FABRICACION: 'Fabricación',
  INSTALACION: 'Instalación/montaje',
  OPERACION: 'Operación',
  MANTENIMIENTO: 'Mantenimiento',
  EXTERNA: 'Causa externa',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  )
}

export default function FailureCatalog() {
  const [sintomas, setSintomas] = useState<Sintoma[]>([])
  const [modos, setModos] = useState<ModoFalla[]>([])
  const [mecanismos, setMecanismos] = useState<MecanismoFalla[]>([])
  const [causas, setCausas] = useState<CausaFalla[]>([])

  useEffect(() => {
    api.get<Paginated<Sintoma>>('/failures/sintomas/').then((r) => setSintomas(r.data.results))
    api.get<Paginated<ModoFalla>>('/failures/modos-falla/').then((r) => setModos(r.data.results))
    api
      .get<Paginated<MecanismoFalla>>('/failures/mecanismos-falla/')
      .then((r) => setMecanismos(r.data.results))
    api.get<Paginated<CausaFalla>>('/failures/causas-falla/').then((r) => setCausas(r.data.results))
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Catálogo de fallas (ISO 14224)</h1>
        <p className="text-sm text-slate-500">
          Taxonomía de síntomas, modos, mecanismos y causas de falla usada al registrar avisos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Síntomas">
          {sintomas.map((s) => (
            <div key={s.id} className="px-4 py-2 text-sm">
              {s.nombre}
            </div>
          ))}
          {sintomas.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">Sin registros.</p>
          )}
        </Section>

        <Section title="Modos de falla">
          {modos.map((m) => (
            <div key={m.id} className="px-4 py-2 text-sm">
              <span className="font-mono text-xs text-slate-400 mr-2">{m.codigo}</span>
              {m.nombre}
            </div>
          ))}
          {modos.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">Sin registros.</p>}
        </Section>

        <Section title="Mecanismos de falla">
          {mecanismos.map((m) => (
            <div key={m.id} className="px-4 py-2 text-sm">
              <span className="font-mono text-xs text-slate-400 mr-2">{m.codigo}</span>
              {m.nombre}
            </div>
          ))}
          {mecanismos.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">Sin registros.</p>
          )}
        </Section>

        <Section title="Causas de falla">
          {causas.map((c) => (
            <div key={c.id} className="px-4 py-2 text-sm flex items-center justify-between">
              <span>
                <span className="font-mono text-xs text-slate-400 mr-2">{c.codigo}</span>
                {c.nombre}
              </span>
              <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                {CATEGORIA_LABELS[c.categoria] ?? c.categoria}
              </span>
            </div>
          ))}
          {causas.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">Sin registros.</p>}
        </Section>
      </div>
    </div>
  )
}
