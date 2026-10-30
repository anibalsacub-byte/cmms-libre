from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Especialidad(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)

    class Meta:
        verbose_name = "Especialidad"
        verbose_name_plural = "Especialidades"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Habilidad(models.Model):
    nombre = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = "Habilidad"
        verbose_name_plural = "Habilidades"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Tecnico(models.Model):
    codigo = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=150)
    especialidad = models.ForeignKey(
        Especialidad, on_delete=models.PROTECT, related_name="tecnicos"
    )
    habilidades = models.ManyToManyField(Habilidad, blank=True, related_name="tecnicos")
    tarifa_hora = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    productividad_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=100,
        validators=[MinValueValidator(0), MaxValueValidator(200)],
        help_text="Factor de productividad real sobre horas estándar (%).",
    )
    capacidad_diaria_horas = models.DecimalField(max_digits=4, decimal_places=2, default=8)
    disponible = models.BooleanField(default=True)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Técnico"
        verbose_name_plural = "Técnicos"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    def carga_diaria_horas(self, fecha):
        """Horas ya asignadas en órdenes de trabajo para una fecha dada."""
        from apps.workorders.models import AsignacionTecnico

        total = AsignacionTecnico.objects.filter(
            tecnico=self, fecha=fecha
        ).aggregate(models.Sum("horas_planificadas"))["horas_planificadas__sum"]
        return total or 0

    def disponibilidad_restante_horas(self, fecha):
        return float(self.capacidad_diaria_horas) - float(self.carga_diaria_horas(fecha))
