from django.db import models
from apps.assets.models import Activo
from apps.failures.models import Sintoma, ModoFalla, MecanismoFalla, CausaFalla


class Aviso(models.Model):
    """Aviso de mantenimiento: reporta una anomalía, independiente de la OT.

    Refleja el flujo real (EN 13306 / SAP PM): primero se notifica la necesidad
    o anomalía, y después se decide si amerita generar una orden de trabajo.
    """

    PRIORIDAD_CHOICES = [
        ("ALTA", "Alta"),
        ("MEDIA", "Media"),
        ("BAJA", "Baja"),
    ]
    ESTADO_CHOICES = [
        ("ABIERTO", "Abierto"),
        ("EN_EVALUACION", "En evaluación"),
        ("CONVERTIDO_OT", "Convertido a OT"),
        ("RECHAZADO", "Rechazado"),
        ("CERRADO", "Cerrado"),
    ]

    numero = models.CharField(max_length=20, unique=True, editable=False)
    activo = models.ForeignKey(Activo, on_delete=models.PROTECT, related_name="avisos")
    reportado_por = models.CharField(max_length=150)
    fecha_reporte = models.DateTimeField(auto_now_add=True)
    descripcion = models.TextField()

    sintoma = models.ForeignKey(Sintoma, null=True, blank=True, on_delete=models.SET_NULL)
    modo_falla = models.ForeignKey(ModoFalla, null=True, blank=True, on_delete=models.SET_NULL)
    mecanismo_falla = models.ForeignKey(
        MecanismoFalla, null=True, blank=True, on_delete=models.SET_NULL
    )
    causa_falla = models.ForeignKey(CausaFalla, null=True, blank=True, on_delete=models.SET_NULL)

    prioridad = models.CharField(
        max_length=10,
        choices=PRIORIDAD_CHOICES,
        default="MEDIA",
        help_text="Urgencia del evento, independiente de la criticidad del activo.",
    )
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="ABIERTO")

    afecta_produccion = models.BooleanField(default=False)
    tiempo_parada_horas = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    fecha_cierre = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Aviso de mantenimiento"
        verbose_name_plural = "Avisos de mantenimiento"
        ordering = ["-fecha_reporte"]

    def __str__(self):
        return f"{self.numero} - {self.activo.codigo}"

    def save(self, *args, **kwargs):
        if not self.numero:
            ultimo = Aviso.objects.order_by("-id").first()
            siguiente = (ultimo.id + 1) if ultimo else 1
            self.numero = f"AV-{siguiente:06d}"
        super().save(*args, **kwargs)
