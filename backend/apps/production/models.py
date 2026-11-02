from django.db import models
from apps.assets.models import Activo


class LineaProduccion(models.Model):
    empresa = models.ForeignKey("companies.Empresa", null=True, blank=True, on_delete=models.CASCADE, related_name="lineas_produccion")
    codigo = models.CharField(max_length=20)
    nombre = models.CharField(max_length=150)
    velocidad_nominal = models.DecimalField(
        max_digits=10, decimal_places=2, help_text="Unidades/hora a capacidad nominal."
    )
    activo_principal = models.ForeignKey(
        Activo, null=True, blank=True, on_delete=models.SET_NULL, related_name="lineas"
    )

    class Meta:
        verbose_name = "Línea de producción"
        verbose_name_plural = "Líneas de producción"
        ordering = ["codigo"]
        constraints = [
            models.UniqueConstraint(fields=["empresa", "codigo"], name="lineaproduccion_empresa_codigo_unico")
        ]

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class RegistroProduccion(models.Model):
    """Datos de un turno/periodo, usados para calcular OEE (disponibilidad x
    rendimiento x calidad)."""

    linea = models.ForeignKey(LineaProduccion, on_delete=models.CASCADE, related_name="registros")
    fecha = models.DateField()
    turno = models.CharField(max_length=20, default="Único")
    tiempo_planificado_horas = models.DecimalField(max_digits=6, decimal_places=2)
    tiempo_parada_horas = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    unidades_producidas = models.PositiveIntegerField(default=0)
    unidades_buenas = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Registro de producción"
        verbose_name_plural = "Registros de producción"
        ordering = ["-fecha"]
        unique_together = ("linea", "fecha", "turno")

    def __str__(self):
        return f"{self.linea.codigo} {self.fecha} ({self.turno})"

    @property
    def tiempo_operativo_horas(self):
        return float(self.tiempo_planificado_horas) - float(self.tiempo_parada_horas)

    @property
    def disponibilidad(self):
        if not self.tiempo_planificado_horas:
            return 0
        return self.tiempo_operativo_horas / float(self.tiempo_planificado_horas)

    @property
    def rendimiento(self):
        """Performance: unidades reales vs. las esperadas a velocidad nominal."""
        esperado = float(self.linea.velocidad_nominal) * self.tiempo_operativo_horas
        if not esperado:
            return 0
        return min(self.unidades_producidas / esperado, 1)

    @property
    def calidad(self):
        if not self.unidades_producidas:
            return 0
        return self.unidades_buenas / self.unidades_producidas

    @property
    def oee(self):
        return self.disponibilidad * self.rendimiento * self.calidad


class ImpactoOperativoFalla(models.Model):
    """Modela cómo una falla (aviso/OT) afectó producción: no solo que ocurrió,
    sino su efecto en disponibilidad, velocidad y calidad."""

    aviso = models.ForeignKey(
        "notices.Aviso", on_delete=models.CASCADE, related_name="impactos_operativos"
    )
    linea = models.ForeignKey(LineaProduccion, on_delete=models.PROTECT, related_name="impactos")
    afecta_disponibilidad = models.BooleanField(default=True)
    afecta_velocidad = models.BooleanField(default=False)
    afecta_calidad = models.BooleanField(default=False)
    unidades_perdidas = models.PositiveIntegerField(default=0)
    costo_impacto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notas = models.TextField(blank=True)

    class Meta:
        verbose_name = "Impacto operativo de falla"
        verbose_name_plural = "Impactos operativos de falla"

    def __str__(self):
        return f"Impacto {self.aviso.numero} en {self.linea.codigo}"
