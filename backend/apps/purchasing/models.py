from django.db import models
from apps.inventory.models import Material, Almacen


class OrdenCompra(models.Model):
    """Compra a proveedor externo, normal o de emergencia, asociada opcionalmente
    a la orden de trabajo que la originó."""

    TIPO_CHOICES = [
        ("NORMAL", "Normal"),
        ("EMERGENCIA", "Emergencia"),
    ]
    ESTADO_CHOICES = [
        ("SOLICITADA", "Solicitada"),
        ("APROBADA", "Aprobada"),
        ("EN_TRANSITO", "En tránsito"),
        ("RECIBIDA", "Recibida"),
        ("CANCELADA", "Cancelada"),
    ]

    numero = models.CharField(max_length=20, editable=False)
    material = models.ForeignKey(Material, on_delete=models.PROTECT, related_name="ordenes_compra")
    orden_trabajo = models.ForeignKey(
        "workorders.OrdenTrabajo",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ordenes_compra",
    )
    tipo = models.CharField(max_length=15, choices=TIPO_CHOICES, default="NORMAL")
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    proveedor = models.CharField(max_length=150, blank=True)
    costo_estimado = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tiempo_entrega_dias = models.PositiveIntegerField(default=0)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="SOLICITADA")
    almacen_destino = models.ForeignKey(Almacen, on_delete=models.PROTECT, related_name="compras")
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_recepcion = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Orden de compra"
        verbose_name_plural = "Órdenes de compra"
        ordering = ["-fecha_solicitud"]

    def __str__(self):
        return f"{self.numero} ({self.get_tipo_display()})"

    def save(self, *args, **kwargs):
        if not self.numero:
            siguiente = OrdenCompra.objects.filter(material__empresa=self.material.empresa).count() + 1
            self.numero = f"OC-{siguiente:06d}"
        super().save(*args, **kwargs)


class SolicitudMaterial(models.Model):
    """Decisión de abastecimiento para un material requerido por una OT:
    stock local, traslado interno, compra normal o compra de emergencia -
    cada una con su propio costo y tiempo asociado."""

    FUENTE_CHOICES = [
        ("STOCK_LOCAL", "Stock local"),
        ("TRASLADO", "Traslado entre almacenes"),
        ("COMPRA_NORMAL", "Compra normal"),
        ("COMPRA_EMERGENCIA", "Compra de emergencia"),
    ]
    ESTADO_CHOICES = [
        ("PENDIENTE", "Pendiente"),
        ("EN_PROCESO", "En proceso"),
        ("DISPONIBLE", "Disponible"),
        ("CANCELADA", "Cancelada"),
    ]

    orden_trabajo = models.ForeignKey(
        "workorders.OrdenTrabajo", on_delete=models.CASCADE, related_name="solicitudes_material"
    )
    material = models.ForeignKey(Material, on_delete=models.PROTECT, related_name="solicitudes")
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    fuente = models.CharField(max_length=20, choices=FUENTE_CHOICES)
    traslado = models.ForeignKey(
        "inventory.TrasladoAlmacen", null=True, blank=True, on_delete=models.SET_NULL
    )
    orden_compra = models.ForeignKey(
        OrdenCompra, null=True, blank=True, on_delete=models.SET_NULL, related_name="solicitudes"
    )
    costo_estimado = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tiempo_estimado_horas = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default="PENDIENTE")

    class Meta:
        verbose_name = "Solicitud de material"
        verbose_name_plural = "Solicitudes de material"

    def __str__(self):
        return f"{self.material.codigo} x{self.cantidad} ({self.get_fuente_display()})"
