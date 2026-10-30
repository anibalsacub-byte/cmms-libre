const COLORS: Record<string, string> = {
  ALTA: 'bg-red-100 text-red-700',
  MEDIA: 'bg-amber-100 text-amber-700',
  BAJA: 'bg-emerald-100 text-emerald-700',
}

export default function Badge({ value, map }: { value: string; map?: Record<string, string> }) {
  const classes = (map ?? COLORS)[value] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
      {value}
    </span>
  )
}
