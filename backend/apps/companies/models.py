from django.db import models


class Empresa(models.Model):
    """Una 'empresa' = un espacio de datos aislado (multi-tenant): cada
    alumno, grupo o cliente crea la suya y nunca ve los datos de otra."""

    nombre = models.CharField(max_length=150)
    creada_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre
