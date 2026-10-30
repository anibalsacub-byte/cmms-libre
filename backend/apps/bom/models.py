from django.db import models
from apps.assets.models import Activo
from apps.inventory.models import Material


class EquipoMaterial(models.Model):
    """Relación activo-repuesto (equivalente a LM20): qué materiales son compatibles
    con un activo, para no tener que buscar repuestos solo por descripción."""

    activo = models.ForeignKey(Activo, on_delete=models.CASCADE, related_name="repuestos")
    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name="equipos")
    cantidad_referencia = models.DecimalField(
        max_digits=10, decimal_places=2, default=1,
        help_text="Cantidad típica usada por intervención.",
    )
    notas = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "Repuesto de activo"
        verbose_name_plural = "Repuestos de activo (BOM)"
        unique_together = ("activo", "material")

    def __str__(self):
        return f"{self.activo.codigo} <-> {self.material.codigo}"
