from django.db import models


class UbicacionTecnica(models.Model):
    """Jerarquía de planta (ISO 55000 / estilo SAP PM: planta > área > línea > sistema)."""

    empresa = models.ForeignKey("companies.Empresa", null=True, blank=True, on_delete=models.CASCADE, related_name="ubicaciones_tecnicas")
    codigo = models.CharField(max_length=30)
    nombre = models.CharField(max_length=150)
    padre = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="hijos"
    )
    nivel = models.PositiveSmallIntegerField(default=0, editable=False)
    descripcion = models.TextField(blank=True)

    class Meta:
        verbose_name = "Ubicación técnica"
        verbose_name_plural = "Ubicaciones técnicas"
        ordering = ["codigo"]
        constraints = [
            models.UniqueConstraint(fields=["empresa", "codigo"], name="ubicaciontecnica_empresa_codigo_unico")
        ]

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    def save(self, *args, **kwargs):
        self.nivel = (self.padre.nivel + 1) if self.padre_id else 0
        super().save(*args, **kwargs)

    def ruta(self):
        partes, nodo = [self.nombre], self.padre
        while nodo:
            partes.insert(0, nodo.nombre)
            nodo = nodo.padre
        return " / ".join(partes)


class ClaseActivo(models.Model):
    empresa = models.ForeignKey("companies.Empresa", null=True, blank=True, on_delete=models.CASCADE, related_name="clases_activo")
    codigo = models.CharField(max_length=30)
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)

    class Meta:
        verbose_name = "Clase de activo"
        verbose_name_plural = "Clases de activo"
        ordering = ["codigo"]
        constraints = [
            models.UniqueConstraint(fields=["empresa", "codigo"], name="claseactivo_empresa_codigo_unico")
        ]

    def __str__(self):
        return self.nombre


class Activo(models.Model):
    """Equipo / activo físico mantenible (equivalente a Equipment en SAP PM)."""

    CRITICIDAD_CHOICES = [
        ("ALTA", "Alta"),
        ("MEDIA", "Media"),
        ("BAJA", "Baja"),
    ]
    ESTADO_CHOICES = [
        ("OPERATIVO", "Operativo"),
        ("EN_MANTENIMIENTO", "En mantenimiento"),
        ("FUERA_DE_SERVICIO", "Fuera de servicio"),
        ("DADO_DE_BAJA", "Dado de baja"),
    ]

    empresa = models.ForeignKey("companies.Empresa", null=True, blank=True, on_delete=models.CASCADE, related_name="activos")
    codigo = models.CharField(max_length=30)
    nombre = models.CharField(max_length=150)
    clase = models.ForeignKey(ClaseActivo, on_delete=models.PROTECT, related_name="activos")
    ubicacion_tecnica = models.ForeignKey(
        UbicacionTecnica, on_delete=models.PROTECT, related_name="activos"
    )
    sistema = models.CharField(max_length=100, blank=True)
    padre = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="componentes",
        help_text="Componente de otro activo (árbol técnico / BOM físico).",
    )
    criticidad = models.CharField(max_length=10, choices=CRITICIDAD_CHOICES, default="MEDIA")
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="OPERATIVO")
    fabricante = models.CharField(max_length=100, blank=True)
    modelo = models.CharField(max_length=100, blank=True)
    numero_serie = models.CharField(max_length=100, blank=True)
    fecha_instalacion = models.DateField(null=True, blank=True)
    fecha_baja = models.DateField(null=True, blank=True)
    costo_adquisicion = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    horas_operacion_acumuladas = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Horómetro acumulado, usado para calcular MTBF/disponibilidad.",
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Activo"
        verbose_name_plural = "Activos"
        ordering = ["codigo"]
        constraints = [
            models.UniqueConstraint(fields=["empresa", "codigo"], name="activo_empresa_codigo_unico")
        ]

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class FichaTecnicaCampo(models.Model):
    """Ficha técnica como pares atributo/valor, flexible por clase de activo."""

    activo = models.ForeignKey(Activo, on_delete=models.CASCADE, related_name="ficha_tecnica")
    atributo = models.CharField(max_length=100)
    valor = models.CharField(max_length=255)
    unidad = models.CharField(max_length=30, blank=True)

    class Meta:
        verbose_name = "Campo de ficha técnica"
        verbose_name_plural = "Ficha técnica"
        unique_together = ("activo", "atributo")

    def __str__(self):
        return f"{self.activo.codigo}: {self.atributo} = {self.valor} {self.unidad}".strip()
