from datetime import timedelta

from django.utils import timezone

from apps.workorders.models import OrdenTrabajo, TareaOT, BitacoraOT
from .models import PlanPreventivo


def generar_ordenes_pendientes(usuario=""):
    """Revisa todos los planes activos y genera una OT preventiva para cada
    uno que esté vencido (o dentro de su ventana de anticipación), avanzando
    su próximo vencimiento."""

    creadas = []
    for plan in PlanPreventivo.objects.filter(activo_flag=True).select_related("activo"):
        if not plan.esta_vencido():
            continue

        orden = OrdenTrabajo.objects.create(
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
