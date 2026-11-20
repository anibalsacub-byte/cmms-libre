from django.db import models


class Empresa(models.Model):
    """Una 'empresa' = un espacio de datos aislado (multi-tenant): cada
    alumno, grupo o cliente crea la suya y nunca ve los datos de otra."""

    nombre = models.CharField(max_length=150)
    creada_en = models.DateTimeField(auto_now_add=True)
    exige_clasificacion_falla_en_cierre = models.BooleanField(
        default=True,
        help_text=(
            "Si está activo, exige modo/mecanismo/causa de falla (ISO 14224) "
            "al cerrar una OT correctiva."
        ),
    )
    patron_codigo = models.CharField(
        max_length=100,
        blank=True,
        help_text=(
            "Expresión regular opcional (P1-9) que deben cumplir los códigos de "
            "activos, materiales, técnicos, clases de activo y ubicaciones técnicas. "
            "Vacío = sin regla. Ej. ^[A-Z]{2,4}-\\d{3,6}$ para algo como BMB-001."
        ),
    )

    class Meta:
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class RegistroAuditoria(models.Model):
    """P2-6: quién cambió qué y cuándo, en los módulos de negocio
    principales (no en cada tabla hija, para no ahogar el registro en
    ruido). Guarda el usuario como texto (no FK) para que el registro
    sobreviva aunque esa cuenta se desactive o elimine después."""

    ACCION_CHOICES = [
        ("CREAR", "Crear"),
        ("EDITAR", "Editar"),
        ("ELIMINAR", "Eliminar"),
    ]

    empresa = models.ForeignKey(
        Empresa, null=True, blank=True, on_delete=models.CASCADE, related_name="auditoria"
    )
    usuario = models.CharField(max_length=150, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)
    accion = models.CharField(max_length=10, choices=ACCION_CHOICES)
    modelo = models.CharField(max_length=100, help_text="app_label.model_name")
    objeto_id = models.PositiveIntegerField(null=True, blank=True)
    objeto_str = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "Registro de auditoría"
        verbose_name_plural = "Registros de auditoría"
        ordering = ["-fecha"]

    def __str__(self):
        return f"{self.usuario} {self.accion} {self.modelo}#{self.objeto_id}"
