"""Cálculo de indicadores de mantenimiento (EN 13306 / ISO 14224).

Fórmulas usadas (simplificadas para el MVP, documentadas también en pantalla
en el Dashboard):

- MTTR (Mean Time To Repair) = horas de parada acumuladas / número de fallas.
- MTBF (Mean Time Between Failures) = horas operativas disponibles / número de fallas,
  donde "horas operativas disponibles" = (nº de activos activos x horas del periodo) - downtime.
- Disponibilidad = horas operativas disponibles / horas totales del periodo = MTBF / (MTBF + MTTR).
- % preventivo / % correctivo = OT de ese tipo creadas en el período ÷ total de OT creadas en el período.
- Costo por activo = costo total (mano de obra + materiales) de sus OT en el período.
- Edad de OT abiertas = promedio de días transcurridos desde la creación de cada OT que sigue sin cerrar
  o cancelar (sin filtrar por período: siempre mira el total de OT abiertas hoy).
- Cumplimiento del plan preventivo = % de planes preventivos activos que NO están vencidos hoy.

Todas las funciones reciben `empresa` y filtran únicamente los datos de esa
empresa (multi-tenant: cada una ve solo lo suyo). Los filtros `activo_id`,
`clase_id` y `ubicacion_id` se combinan (AND) y `ubicacion_id` incluye las
ubicaciones hijas de la seleccionada.
"""

from datetime import timedelta
from django.utils import timezone
from django.db.models import Count

from apps.assets.models import Activo, UbicacionTecnica
from apps.notices.models import Aviso
from apps.workorders.models import OrdenTrabajo
from apps.production.models import RegistroProduccion
from apps.pm_plans.models import PlanPreventivo


def rango_periodo(dias=30):
    fin = timezone.now()
    inicio = fin - timedelta(days=dias)
    return inicio, fin


def _ids_ubicacion_y_descendientes(ubicacion_id):
    ids = [int(ubicacion_id)]
    frontera = ids
    while frontera:
        hijos = list(
            UbicacionTecnica.objects.filter(padre_id__in=frontera).values_list("id", flat=True)
        )
        ids.extend(hijos)
        frontera = hijos
    return ids


def _ids_activos_filtrados(empresa, activo_id=None, clase_id=None, ubicacion_id=None):
    qs = Activo.objects.filter(empresa=empresa)
    if activo_id:
        qs = qs.filter(id=activo_id)
    if clase_id:
        qs = qs.filter(clase_id=clase_id)
    if ubicacion_id:
        qs = qs.filter(ubicacion_tecnica_id__in=_ids_ubicacion_y_descendientes(ubicacion_id))
    return list(qs.values_list("id", flat=True))


def kpis_mantenimiento(empresa, dias=30, activo_id=None, clase_id=None, ubicacion_id=None):
    inicio, fin = rango_periodo(dias)
    hay_filtro = bool(activo_id or clase_id or ubicacion_id)
    activo_ids = _ids_activos_filtrados(empresa, activo_id, clase_id, ubicacion_id)

    ot_todas_qs = OrdenTrabajo.objects.filter(empresa=empresa)
    if hay_filtro:
        ot_todas_qs = ot_todas_qs.filter(activo_id__in=activo_ids)

    ot_correctivas_periodo_qs = ot_todas_qs.filter(
        tipo="CORRECTIVO", fecha_creacion__gte=inicio, fecha_creacion__lte=fin
    ).select_related("activo").prefetch_related("asignaciones__tecnico", "materiales")
    ot_periodo_qs = ot_todas_qs.filter(
        fecha_creacion__gte=inicio, fecha_creacion__lte=fin
    ).select_related("activo").prefetch_related("asignaciones__tecnico", "materiales")

    # Cada queryset se evalúa una sola vez y se reutiliza la lista resultante
    # para todos los cálculos que siguen (evita N+1 y consultas duplicadas).
    ot_correctivas_periodo = list(ot_correctivas_periodo_qs)
    ot_periodo = list(ot_periodo_qs)

    n_fallas = len(ot_correctivas_periodo)
    downtime_total = float(
        sum((ot.tiempo_parada_horas or 0) for ot in ot_correctivas_periodo)
    )

    activos_qs = Activo.objects.filter(empresa=empresa, estado__in=["OPERATIVO", "EN_MANTENIMIENTO"])
    if hay_filtro:
        activos_qs = activos_qs.filter(id__in=activo_ids)
    n_activos = activos_qs.count() or 1

    horas_periodo_totales = n_activos * dias * 24
    horas_operativas = max(horas_periodo_totales - downtime_total, 0)

    mttr = round(downtime_total / n_fallas, 2) if n_fallas else 0
    mtbf = round(horas_operativas / n_fallas, 2) if n_fallas else horas_operativas
    disponibilidad = (
        round(horas_operativas / horas_periodo_totales * 100, 2)
        if horas_periodo_totales
        else 0
    )

    costo_total = sum(ot.costo_total for ot in ot_correctivas_periodo)

    avisos_qs = Aviso.objects.filter(empresa=empresa, fecha_reporte__gte=inicio, fecha_reporte__lte=fin)
    if hay_filtro:
        avisos_qs = avisos_qs.filter(activo_id__in=activo_ids)

    # OT abiertas (sin filtrar por período): se evalúa una sola vez y se
    # reutiliza tanto para el conteo (backlog / abiertas) como para la edad.
    ot_abiertas_list = list(
        ot_todas_qs.exclude(estado__in=["CERRADA", "CANCELADA"]).only("id", "fecha_creacion")
    )
    backlog = len(ot_abiertas_list)

    # % preventivo / correctivo del total de OT creadas en el período.
    total_ot_periodo = len(ot_periodo)
    conteo_por_tipo = {}
    for ot in ot_periodo:
        conteo_por_tipo[ot.tipo] = conteo_por_tipo.get(ot.tipo, 0) + 1
    pct_preventivo = (
        round(conteo_por_tipo.get("PREVENTIVO", 0) / total_ot_periodo * 100, 1)
        if total_ot_periodo
        else 0
    )
    pct_correctivo = (
        round(conteo_por_tipo.get("CORRECTIVO", 0) / total_ot_periodo * 100, 1)
        if total_ot_periodo
        else 0
    )

    # Costo por activo: top 10 del período, de mayor a menor.
    costo_por_activo_map = {}
    for ot in ot_periodo:
        entrada = costo_por_activo_map.setdefault(
            ot.activo_id,
            {"activo_codigo": ot.activo.codigo, "activo_nombre": ot.activo.nombre, "costo": 0.0},
        )
        entrada["costo"] += ot.costo_total
    costo_por_activo = sorted(
        ({**e, "costo": round(e["costo"], 2)} for e in costo_por_activo_map.values()),
        key=lambda e: -e["costo"],
    )[:10]

    # Edad de las OT actualmente abiertas (sin filtrar por período).
    ahora = timezone.now()
    edades_dias = [
        (ahora - ot.fecha_creacion).total_seconds() / 86400 for ot in ot_abiertas_list
    ]
    edad_promedio_ot_abiertas_dias = (
        round(sum(edades_dias) / len(edades_dias), 1) if edades_dias else 0
    )

    # Cumplimiento del plan preventivo: % de planes activos no vencidos hoy.
    planes_qs = PlanPreventivo.objects.filter(
        activo__empresa=empresa, activo_flag=True
    ).select_related("activo")
    if hay_filtro:
        planes_qs = planes_qs.filter(activo_id__in=activo_ids)
    planes = list(planes_qs)
    total_planes = len(planes)
    vencidos = sum(1 for p in planes if p.esta_vencido())
    cumplimiento_preventivo_pct = (
        round((total_planes - vencidos) / total_planes * 100, 1) if total_planes else None
    )

    return {
        "periodo_dias": dias,
        "mtbf_horas": mtbf,
        "mttr_horas": mttr,
        "disponibilidad_pct": disponibilidad,
        "downtime_horas": round(downtime_total, 2),
        "numero_fallas": n_fallas,
        "costo_mantenimiento": round(costo_total, 2),
        "avisos_abiertos": avisos_qs.filter(
            estado__in=["ABIERTO", "EN_EVALUACION"]
        ).count(),
        "avisos_totales_periodo": avisos_qs.count(),
        "ordenes_trabajo_abiertas": backlog,
        "backlog": backlog,
        "ordenes_por_estado": dict(
            ot_todas_qs.values("estado").annotate(total=Count("id")).values_list(
                "estado", "total"
            )
        ),
        "pct_preventivo": pct_preventivo,
        "pct_correctivo": pct_correctivo,
        "costo_por_activo": costo_por_activo,
        "edad_promedio_ot_abiertas_dias": edad_promedio_ot_abiertas_dias,
        "cumplimiento_preventivo_pct": cumplimiento_preventivo_pct,
        "total_planes_preventivos_activos": total_planes,
    }


def pareto_fallas(empresa, dias=90, activo_id=None):
    """Conteo de avisos por modo, mecanismo y causa de falla (ISO 14224),
    para priorizar qué atacar primero."""

    inicio, fin = rango_periodo(dias)
    avisos = Aviso.objects.filter(empresa=empresa, fecha_reporte__gte=inicio, fecha_reporte__lte=fin)
    if activo_id:
        avisos = avisos.filter(activo_id=activo_id)

    por_modo = (
        avisos.exclude(modo_falla__isnull=True)
        .values("modo_falla__codigo", "modo_falla__nombre")
        .annotate(total=Count("id"))
        .order_by("-total")
    )
    por_mecanismo = (
        avisos.exclude(mecanismo_falla__isnull=True)
        .values("mecanismo_falla__codigo", "mecanismo_falla__nombre")
        .annotate(total=Count("id"))
        .order_by("-total")
    )
    por_causa = (
        avisos.exclude(causa_falla__isnull=True)
        .values("causa_falla__codigo", "causa_falla__nombre", "causa_falla__categoria")
        .annotate(total=Count("id"))
        .order_by("-total")
    )

    return {
        "periodo_dias": dias,
        "por_modo": [
            {"codigo": r["modo_falla__codigo"], "nombre": r["modo_falla__nombre"], "total": r["total"]}
            for r in por_modo
        ],
        "por_mecanismo": [
            {
                "codigo": r["mecanismo_falla__codigo"],
                "nombre": r["mecanismo_falla__nombre"],
                "total": r["total"],
            }
            for r in por_mecanismo
        ],
        "por_causa": [
            {
                "codigo": r["causa_falla__codigo"],
                "nombre": r["causa_falla__nombre"],
                "categoria": r["causa_falla__categoria"],
                "total": r["total"],
            }
            for r in por_causa
        ],
    }


def reporte_costos(empresa, dias=90, activo_id=None, clase_id=None, ubicacion_id=None):
    """P2-5: reporte de costo de mantenimiento por activo y por ubicación
    técnica, en el período — a diferencia de `costo_por_activo` del
    Dashboard (que recorta a los 10 más caros), este trae la lista completa
    para exportar/imprimir."""

    inicio, fin = rango_periodo(dias)
    activo_ids = _ids_activos_filtrados(empresa, activo_id, clase_id, ubicacion_id)
    ot_qs = (
        OrdenTrabajo.objects.filter(
            empresa=empresa,
            activo_id__in=activo_ids,
            fecha_creacion__gte=inicio,
            fecha_creacion__lte=fin,
        )
        .select_related("activo", "activo__ubicacion_tecnica")
        .prefetch_related("asignaciones__tecnico", "materiales")
        .order_by("activo__codigo", "fecha_creacion")
    )

    # Se evalúa una sola vez y se reutiliza la lista para el recorrido y el conteo.
    ot_list = list(ot_qs)

    por_activo_map = {}
    por_ubicacion_map = {}
    costo_total = 0.0

    for ot in ot_list:
        costo = ot.costo_total
        costo_total += costo

        activo = ot.activo
        entrada_activo = por_activo_map.setdefault(
            activo.id,
            {"activo_codigo": activo.codigo, "activo_nombre": activo.nombre, "costo": 0.0, "numero_ot": 0},
        )
        entrada_activo["costo"] += costo
        entrada_activo["numero_ot"] += 1

        ubicacion = activo.ubicacion_tecnica
        entrada_ubicacion = por_ubicacion_map.setdefault(
            ubicacion.id,
            {"ubicacion_codigo": ubicacion.codigo, "ubicacion_nombre": ubicacion.nombre, "costo": 0.0},
        )
        entrada_ubicacion["costo"] += costo

    por_activo = sorted(
        ({**e, "costo": round(e["costo"], 2)} for e in por_activo_map.values()),
        key=lambda e: -e["costo"],
    )
    por_ubicacion = sorted(
        ({**e, "costo": round(e["costo"], 2)} for e in por_ubicacion_map.values()),
        key=lambda e: -e["costo"],
    )

    return {
        "periodo_dias": dias,
        "costo_total": round(costo_total, 2),
        "numero_ot": len(ot_list),
        "por_activo": por_activo,
        "por_ubicacion": por_ubicacion,
    }


def kpis_oee(empresa, dias=30, linea_id=None):
    inicio, _ = rango_periodo(dias)
    qs = RegistroProduccion.objects.filter(linea__empresa=empresa, fecha__gte=inicio.date())
    if linea_id:
        qs = qs.filter(linea_id=linea_id)

    registros = list(qs)
    if not registros:
        return {"disponibilidad": 0, "rendimiento": 0, "calidad": 0, "oee": 0, "registros": 0}

    disponibilidad = sum(r.disponibilidad for r in registros) / len(registros)
    rendimiento = sum(r.rendimiento for r in registros) / len(registros)
    calidad = sum(r.calidad for r in registros) / len(registros)
    oee = disponibilidad * rendimiento * calidad

    return {
        "disponibilidad": round(disponibilidad * 100, 2),
        "rendimiento": round(rendimiento * 100, 2),
        "calidad": round(calidad * 100, 2),
        "oee": round(oee * 100, 2),
        "registros": len(registros),
    }
