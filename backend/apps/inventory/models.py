from django.db import models


class Almacen(models.Model):
    codigo = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=150)
    ubicacion = models.CharField(max_length=150, blank=True)

    class Meta:
        verbose_name = "Almacén"
        verbose_name_plural = "Almacenes"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class GrupoMaterial(models.Model):
    nombre = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = "Grupo de material"
        verbose_name_plural = "Grupos de material"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Material(models.Model):
    """Maestro de materiales (repuestos, consumibles de mantenimiento - estilo MRO)."""

    ESTADO_CHOICES = [
        ("ACTIVO", "Activo"),
        ("DESCONTINUADO", "Descontinuado"),
        ("BLOQUEADO", "Bloqueado"),
    ]

    codigo = models.CharField(max_length=30, unique=True)
    descripcion = models.CharField(max_length=255)
    grupo = models.ForeignKey(
        GrupoMaterial, on_delete=models.PROTECT, related_name="materiales"
    )
    clase = models.CharField(max_length=100, blank=True)
    unidad_medida = models.CharField(max_length=10, default="UN")
    costo_unitario = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="ACTIVO")
    tiempo_entrega_dias = models.PositiveIntegerField(
        default=0, help_text="Lead time típico de compra normal."
    )

    class Meta:
        verbose_name = "Material"
        verbose_name_plural = "Materiales"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} - {self.descripcion}"


class StockAlmacen(models.Model):
    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name="stocks")
    almacen = models.ForeignKey(Almacen, on_delete=models.CASCADE, related_name="stocks")
    ubicacion_en_almacen = models.CharField(max_length=50, blank=True)
    cantidad = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock_minimo = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        verbose_name = "Stock por almacén"
        verbose_name_plural = "Stock por almacén"
        unique_together = ("material", "almacen")

    def __str__(self):
        return f"{self.material.codigo} @ {self.almacen.codigo}: {self.cantidad}"

    @property
    def bajo_minimo(self):
        return self.cantidad < self.stock_minimo


class MovimientoStock(models.Model):
    TIPO_CHOICES = [
        ("ENTRADA", "Entrada"),
        ("SALIDA", "Salida"),
        ("AJUSTE", "Ajuste"),
    ]
    material = models.ForeignKey(Material, on_delete=models.PROTECT, related_name="movimientos")
    almacen = models.ForeignKey(Almacen, on_delete=models.PROTECT, related_name="movimientos")
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    referencia = models.CharField(
        max_length=50, blank=True, help_text="Ej. número de OT que consumió el material."
    )
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Movimiento de stock"
        verbose_name_plural = "Movimientos de stock"
        ordering = ["-fecha"]

    def __str__(self):
        return f"{self.tipo} {self.cantidad} {self.material.codigo} ({self.almacen.codigo})"


class TrasladoAlmacen(models.Model):
    """Traslado interno entre almacenes (equivalente a TR20)."""

    ESTADO_CHOICES = [
        ("SOLICITADO", "Solicitado"),
        ("EN_TRANSITO", "En tránsito"),
        ("RECIBIDO", "Recibido"),
        ("CANCELADO", "Cancelado"),
    ]
    material = models.ForeignKey(Material, on_delete=models.PROTECT, related_name="traslados")
    almacen_origen = models.ForeignKey(
        Almacen, on_delete=models.PROTECT, related_name="traslados_salientes"
    )
    almacen_destino = models.ForeignKey(
        Almacen, on_delete=models.PROTECT, related_name="traslados_entrantes"
    )
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="SOLICITADO")
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_recepcion = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Traslado entre almacenes"
        verbose_name_plural = "Traslados entre almacenes"
        ordering = ["-fecha_solicitud"]

    def __str__(self):
        return f"{self.material.codigo}: {self.almacen_origen.codigo} -> {self.almacen_destino.codigo}"
