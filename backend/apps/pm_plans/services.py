from datetime import timedelta

from django.utils import timezone

from apps.workorders.models import OrdenTrabajo, TareaOT, BitacoraOT
from .models import PlanPreventivo


def generar_ordenes_pendientes(empresa=None, usuario=""):
    """Revisa los planes activos y genera una OT preventiva para cada uno
    que esté vencido, avanzando su próximo vencimiento. Sin `empresa`,
    recorre TODAS las empresas (pensado para el cron/comando programado);
    con `empresa`, solo los planes de esa empresa (botón manual del
    administrador de esa empresa)."""

    planes = PlanPreventivo.objects.filter(activo_flag=True).select_related("activo")
    if empresa is not None:
        planes = planes.filter(activo__empresa=empresa)

    creadas = []
    for plan in planes:
        if not plan.esta_vencido():
            continue

        orden = OrdenTrabajo.objects.create(
            empresa=plan.activo.empresa,
            activo=plan.activo,
            tipo="PREVENTIVO",
            prioridad="MEDIA",
            descripcion=plan.descripcion or f"Mantenimiento preventivo: {plan.nombre}",
            fecha_planificada=plan.fecha_proxima or timezone.now().date(),
        )
        for i, linea in enumerate(plan.tareas_plantilla.splitlines()):
            texto = linea.strip()
            if texto:
                TareaOT.objects.create(orden_trabajo=orden, descripcion=texto, orden=i)

        BitacoraOT.objects.create(
            orden_trabajo=orden,
            usuario=usuario,
            evento="OT generada automáticamente desde plan preventivo",
            detalle=plan.nombre,
        )

        if plan.tipo == "CALENDARIO" and plan.frecuencia_dias:
            base = plan.fecha_proxima or timezone.now().date()
            plan.fecha_proxima = base + timedelta(days=plan.frecuencia_dias)
        elif plan.tipo == "HOROMETRO" and plan.frecuencia_horas:
            base = plan.horometro_proximo or plan.activo.horas_operacion_acumuladas
            plan.horometro_proximo = float(base) + float(plan.frecuencia_horas)

        plan.ultima_generacion = timezone.now()
        plan.save()

        creadas.append(orden)

    return creadas
