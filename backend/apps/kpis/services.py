"""Cálculo de indicadores de mantenimiento (EN 13306 / ISO 14224).

Fórmulas usadas (simplificadas para el MVP, documentadas en el README):

- MTTR (Mean Time To Repair) = horas de parada acumuladas / número de fallas.
- MTBF (Mean Time Between Failures) = horas operativas disponibles / número de fallas,
  donde "horas operativas disponibles" = (nº de activos activos x horas del periodo) - downtime.
- Disponibilidad = horas operativas disponibles / horas totales del periodo = MTBF / (MTBF + MTTR).
"""

from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Q

from apps.assets.models import Activo
from apps.notices.models import Aviso
from apps.workorders.models import OrdenTrabajo
from apps.production.models import RegistroProduccion


def rango_periodo(dias=30):
    fin = timezone.now()
    inicio = fin - timedelta(days=dias)
    return inicio, fin


def kpis_mantenimiento(dias=30, activo_id=None):
    inicio, fin = rango_periodo(dias)

    ot_qs = OrdenTrabajo.objects.filter(
        tipo="CORRECTIVO", fecha_creacion__gte=inicio, fecha_creacion__lte=fin
    )
    if activo_id:
        ot_qs = ot_qs.filter(activo_id=activo_id)

    n_fallas = ot_qs.count()
    downtime_total = float(
        ot_qs.aggregate(total=Sum("tiempo_parada_horas"))["total"] or 0
    )

    activos_qs = Activo.objects.filter(estado__in=["OPERATIVO", "EN_MANTENIMIENTO"])
    if activo_id:
        activos_qs = activos_qs.filter(id=activo_id)
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

    costo_total = sum(ot.costo_total for ot in ot_qs)

    avisos_qs = Aviso.objects.filter(fecha_reporte__gte=inicio, fecha_reporte__lte=fin)
    if activo_id:
        avisos_qs = avisos_qs.filter(activo_id=activo_id)

    todas_ot_qs = OrdenTrabajo.objects.all()
    if activo_id:
        todas_ot_qs = todas_ot_qs.filter(activo_id=activo_id)
    backlog = todas_ot_qs.exclude(estado__in=["CERRADA", "CANCELADA"]).count()

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
        "ordenes_trabajo_abiertas": OrdenTrabajo.objects.exclude(
            estado__in=["CERRADA", "CANCELADA"]
        ).count(),
        "backlog": backlog,
        "ordenes_por_estado": dict(
            todas_ot_qs.values("estado").annotate(total=Count("id")).values_list(
                "estado", "total"
            )
        ),
    }


def pareto_fallas(dias=90, activo_id=None):
    """Conteo de avisos por modo, mecanismo y causa de falla (ISO 14224),
    para priorizar qué atacar primero."""

    inicio, fin = rango_periodo(dias)
    avisos = Aviso.objects.filter(fecha_reporte__gte=inicio, fecha_reporte__lte=fin)
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


def kpis_oee(dias=30, linea_id=None):
    inicio, _ = rango_periodo(dias)
    qs = RegistroProduccion.objects.filter(fecha__gte=inicio.date())
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
