from django.db import models


def ruta_adjunto(instance, filename):
    if instance.orden_trabajo_id:
        return f"adjuntos/ot/{instance.orden_trabajo_id}/{filename}"
    if instance.aviso_id:
        return f"adjuntos/avisos/{instance.aviso_id}/{filename}"
    return f"adjuntos/otros/{filename}"


class Adjunto(models.Model):
    """Foto o PDF asociado a un aviso o a una orden de trabajo (evidencia,
    diagnóstico, respaldo del cierre técnico)."""

    aviso = models.ForeignKey(
        "notices.Aviso", null=True, blank=True, on_delete=models.CASCADE, related_name="adjuntos"
    )
    orden_trabajo = models.ForeignKey(
        "workorders.OrdenTrabajo",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="adjuntos",
    )
    archivo = models.FileField(upload_to=ruta_adjunto)
    descripcion = models.CharField(max_length=255, blank=True)
    subido_por = models.CharField(max_length=150, blank=True)
    subido_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Adjunto"
        verbose_name_plural = "Adjuntos"
        ordering = ["-subido_en"]

    def __str__(self):
        return self.archivo.name

    def save(self, *args, **kwargs):
        if not self.aviso_id and not self.orden_trabajo_id:
            raise ValueError("Un adjunto debe asociarse a un aviso o a una orden de trabajo.")
        super().save(*args, **kwargs)
