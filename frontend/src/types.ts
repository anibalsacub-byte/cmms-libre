export type Paginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type Activo = {
  id: number
  codigo: string
  nombre: string
  clase: number
  clase_nombre: string
  ubicacion_tecnica: number
  ubicacion_tecnica_nombre: string
  sistema: string
  criticidad: 'ALTA' | 'MEDIA' | 'BAJA'
  estado: string
  fabricante: string
  modelo: string
  numero_serie: string
  horas_operacion_acumuladas: string
}

export type Aviso = {
  id: number
  numero: string
  activo: number
  activo_codigo: string
  activo_nombre: string
  reportado_por: string
  fecha_reporte: string
  descripcion: string
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA'
  estado: 'ABIERTO' | 'EN_EVALUACION' | 'CONVERTIDO_OT' | 'RECHAZADO' | 'CERRADO'
  afecta_produccion: boolean
  tiempo_parada_horas: string
}

export type OrdenTrabajo = {
  id: number
  numero: string
  activo: number
  activo_codigo: string
  tipo: 'CORRECTIVO' | 'PREVENTIVO' | 'PREDICTIVO' | 'MEJORA'
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA'
  estado: string
  fecha_creacion: string
  fecha_planificada: string | null
  costo_total: number
  en_backlog: boolean
}

export type OrdenTrabajoDetalle = OrdenTrabajo & {
  descripcion: string
  diagnostico: string
  trabajo_realizado: string
  tecnico_principal: number | null
  tecnico_principal_nombre: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  tiempo_parada_horas: string
  costo_mano_obra: number
  costo_materiales: number
  tareas: { id: number; descripcion: string; completada: boolean }[]
  asignaciones: {
    id: number
    tecnico: number
    tecnico_nombre: string
    fecha: string
    horas_planificadas: string
    horas_reales: string | null
  }[]
  materiales: {
    id: number
    material: number
    material_codigo: string
    cantidad: string
    costo_unitario: string
    subtotal: number
    fuente: string
  }[]
  intentos: { id: number; numero_intento: number; fecha: string; descripcion: string; resultado_exitoso: boolean }[]
  bitacora: { id: number; fecha: string; usuario: string; evento: string; detalle: string }[]
}

export type Tecnico = {
  id: number
  codigo: string
  nombre: string
  especialidad: number
  especialidad_nombre: string
  habilidades_nombres: string[]
  tarifa_hora: string
  productividad_pct: string
  capacidad_diaria_horas: string
  disponible: boolean
  activo: boolean
}

export type Material = {
  id: number
  codigo: string
  descripcion: string
  grupo: number
  grupo_nombre: string
  unidad_medida: string
  costo_unitario: string
  estado: string
  tiempo_entrega_dias: number
  stock_total: number
}

export type StockAlmacen = {
  id: number
  material: number
  material_codigo: string
  almacen: number
  almacen_codigo: string
  ubicacion_en_almacen: string
  cantidad: string
  stock_minimo: string
  bajo_minimo: boolean
}

export type DashboardData = {
  mantenimiento: {
    periodo_dias: number
    mtbf_horas: number
    mttr_horas: number
    disponibilidad_pct: number
    downtime_horas: number
    numero_fallas: number
    costo_mantenimiento: number
    avisos_abiertos: number
    avisos_totales_periodo: number
    ordenes_trabajo_abiertas: number
    backlog: number
    ordenes_por_estado: Record<string, number>
  }
  oee: {
    disponibilidad: number
    rendimiento: number
    calidad: number
    oee: number
    registros: number
  }
}
