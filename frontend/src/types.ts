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

export type ClaseActivo = {
  id: number
  codigo: string
  nombre: string
  descripcion: string
}

export type UbicacionTecnica = {
  id: number
  codigo: string
  nombre: string
  padre: number | null
  nivel: number
  ruta: string
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

export type EquipoMaterial = {
  id: number
  activo: number
  activo_codigo: string
  material: number
  material_codigo: string
  material_descripcion: string
  cantidad_referencia: string
  notas: string
}

export type Sintoma = { id: number; nombre: string }

export type ModoFalla = { id: number; codigo: string; nombre: string }

export type MecanismoFalla = { id: number; codigo: string; nombre: string }

export type CausaFalla = {
  id: number
  codigo: string
  nombre: string
  categoria: string
}

export type OrdenCompra = {
  id: number
  numero: string
  material: number
  material_codigo: string
  orden_trabajo: number | null
  tipo: 'NORMAL' | 'EMERGENCIA'
  cantidad: string
  proveedor: string
  costo_estimado: string
  tiempo_entrega_dias: number
  estado: string
  almacen_destino: number
  fecha_solicitud: string
  fecha_recepcion: string | null
}

export type SolicitudMaterial = {
  id: number
  orden_trabajo: number
  orden_trabajo_numero: string
  material: number
  material_codigo: string
  cantidad: string
  fuente: 'STOCK_LOCAL' | 'TRASLADO' | 'COMPRA_NORMAL' | 'COMPRA_EMERGENCIA'
  costo_estimado: string
  tiempo_estimado_horas: string
  estado: string
}

export type LineaProduccion = {
  id: number
  codigo: string
  nombre: string
  velocidad_nominal: string
  activo_principal: number | null
}

export type RegistroProduccion = {
  id: number
  linea: number
  linea_nombre: string
  fecha: string
  turno: string
  tiempo_planificado_horas: string
  tiempo_parada_horas: string
  unidades_producidas: number
  unidades_buenas: number
  disponibilidad: number
  rendimiento: number
  calidad: number
  oee: number
}

export type ImpactoOperativoFalla = {
  id: number
  aviso: number
  aviso_numero: string
  linea: number
  linea_nombre: string
  afecta_disponibilidad: boolean
  afecta_velocidad: boolean
  afecta_calidad: boolean
  unidades_perdidas: number
  costo_impacto: string
  notas: string
}

export type PlanPreventivo = {
  id: number
  activo: number
  activo_codigo: string
  activo_nombre: string
  nombre: string
  descripcion: string
  tareas_plantilla: string
  tipo: 'CALENDARIO' | 'HOROMETRO'
  frecuencia_dias: number | null
  frecuencia_horas: string | null
  dias_anticipacion: number
  fecha_proxima: string | null
  horometro_proximo: string | null
  activo_flag: boolean
  ultima_generacion: string | null
  vencido: boolean
}

export type ParetoData = {
  periodo_dias: number
  por_modo: { codigo: string; nombre: string; total: number }[]
  por_mecanismo: { codigo: string; nombre: string; total: number }[]
  por_causa: { codigo: string; nombre: string; categoria: string; total: number }[]
}

export type Adjunto = {
  id: number
  aviso: number | null
  orden_trabajo: number | null
  archivo: string
  descripcion: string
  subido_por: string
  subido_en: string
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
