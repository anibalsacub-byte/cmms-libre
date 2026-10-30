from django.db import models


class Sintoma(models.Model):
    nombre = models.CharField(max_length=150, unique=True)

    class Meta:
        verbose_name = "Síntoma"
        verbose_name_plural = "Síntomas"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class ModoFalla(models.Model):
    """Failure mode - ISO 14224 §7 (forma en que el activo deja de cumplir su función)."""

    codigo = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=150)

    class Meta:
        verbose_name = "Modo de falla"
        verbose_name_plural = "Modos de falla (ISO 14224)"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class MecanismoFalla(models.Model):
    """Failure mechanism - ISO 14224 (proceso físico/químico/eléctrico que condujo a la falla)."""

    codigo = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=150)

    class Meta:
        verbose_name = "Mecanismo de falla"
        verbose_name_plural = "Mecanismos de falla (ISO 14224)"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class CausaFalla(models.Model):
    """Failure cause - ISO 14224 (categorías: diseño, fabricación, instalación, operación, mantenimiento)."""

    CATEGORIA_CHOICES = [
        ("DISENO", "Diseño"),
        ("FABRICACION", "Fabricación"),
        ("INSTALACION", "Instalación/montaje"),
        ("OPERACION", "Operación"),
        ("MANTENIMIENTO", "Mantenimiento"),
        ("EXTERNA", "Causa externa"),
    ]
    codigo = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=150)
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES)

    class Meta:
        verbose_name = "Causa de falla"
        verbose_name_plural = "Causas de falla (ISO 14224)"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"
