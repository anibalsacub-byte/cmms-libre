from django.db import models
from apps.assets.models import Activo


class PlanPreventivo(models.Model):
    """Plan de mantenimiento preventivo por calendario o por horómetro.
    Genera automáticamente una OT preventiva al acercarse (o llegar) el
    vencimiento (EN 13306: mantenimiento preventivo predeterminado /
    basado en el uso)."""

    TIPO_CHOICES = [
        ("CALENDARIO", "Por calendario"),
        ("HOROMETRO", "Por horómetro (horas de uso)"),
    ]

    activo = models.ForeignKey(Activo, on_delete=models.CASCADE, related_name="planes_preventivos")
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    tareas_plantilla = models.TextField(
        blank=True, help_text="Una tarea por línea; se copian a la OT generada."
    )

    tipo = models.CharField(max_length=15, choices=TIPO_CHOICES)
    frecuencia_dias = models.PositiveIntegerField(null=True, blank=True)
    frecuencia_horas = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dias_anticipacion = models.PositiveIntegerField(
        default=0, help_text="Generar la OT con esta anticipación a la fecha de vencimiento."
    )

    fecha_proxima = models.DateField(null=True, blank=True)
    horometro_proximo = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    activo_flag = models.BooleanField(default=True)
    ultima_generacion = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Plan de mantenimiento preventivo"
        verbose_name_plural = "Planes de mantenimiento preventivo"
        ordering = ["fecha_proxima", "id"]

    def __str__(self):
        return f"{self.nombre} ({self.activo.codigo})"

    def esta_vencido(self):
        from django.utils import timezone
        from datetime import timedelta

        if not self.activo_flag:
            return False
        if self.tipo == "CALENDARIO" and self.fecha_proxima:
            limite = self.fecha_proxima - timedelta(days=self.dias_anticipacion)
            return timezone.now().date() >= limite
        if self.tipo == "HOROMETRO" and self.horometro_proximo is not None:
            return float(self.activo.horas_operacion_acumuladas) >= float(self.horometro_proximo)
        return False
