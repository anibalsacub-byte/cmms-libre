from django.db import models
from apps.assets.models import Activo
from apps.notices.models import Aviso
from apps.hr.models import Tecnico
from apps.inventory.models import Material


class OrdenTrabajo(models.Model):
    """Orden de trabajo (OT): creación, planificación, asignación de personal y
    materiales, diagnóstico, estado, cierre e historial de intentos."""

    TIPO_CHOICES = [
        ("CORRECTIVO", "Correctivo"),
        ("PREVENTIVO", "Preventivo"),
        ("PREDICTIVO", "Predictivo"),
        ("MEJORA", "Mejora"),
    ]
    PRIORIDAD_CHOICES = [
        ("ALTA", "Alta"),
        ("MEDIA", "Media"),
        ("BAJA", "Baja"),
    ]
    ESTADO_CHOICES = [
        ("CREADA", "Creada"),
        ("PLANIFICADA", "Planificada"),
        ("ASIGNADA", "Asignada"),
        ("EN_PROGRESO", "En progreso"),
        ("PENDIENTE_MATERIAL", "Pendiente de material"),
        ("PENDIENTE_APROBACION", "Pendiente de aprobación"),
        ("CERRADA", "Cerrada"),
        ("CANCELADA", "Cancelada"),
    ]

    empresa = models.ForeignKey("companies.Empresa", null=True, blank=True, on_delete=models.CASCADE, related_name="ordenes_trabajo")
    numero = models.CharField(max_length=20, editable=False)
    aviso = models.ForeignKey(
        Aviso, null=True, blank=True, on_delete=models.SET_NULL, related_name="ordenes_trabajo"
    )
    activo = models.ForeignKey(Activo, on_delete=models.PROTECT, related_name="ordenes_trabajo")
    tipo = models.CharField(max_length=15, choices=TIPO_CHOICES, default="CORRECTIVO")
    prioridad = models.CharField(max_length=10, choices=PRIORIDAD_CHOICES, default="MEDIA")
    estado = models.CharField(max_length=25, choices=ESTADO_CHOICES, default="CREADA")

    descripcion = models.TextField()
    diagnostico = models.TextField(blank=True)
    trabajo_realizado = models.TextField(blank=True)

    tecnico_principal = models.ForeignKey(
        Tecnico, null=True, blank=True, on_delete=models.SET_NULL, related_name="ordenes_lideradas"
    )

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_planificada = models.DateField(null=True, blank=True)
    fecha_inicio = models.DateTimeField(null=True, blank=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)

    tiempo_parada_horas = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        help_text="Downtime atribuible a esta OT, para MTTR/disponibilidad.",
    )

    class Meta:
        verbose_name = "Orden de trabajo"
        verbose_name_plural = "Órdenes de trabajo"
        ordering = ["-fecha_creacion"]
        constraints = [
            models.UniqueConstraint(fields=["empresa", "numero"], name="ordentrabajo_empresa_numero_unico")
        ]

    def __str__(self):
        return f"{self.numero} - {self.activo.codigo}"

    def save(self, *args, **kwargs):
        if not self.numero:
            siguiente = OrdenTrabajo.objects.filter(empresa=self.empresa).count() + 1
            self.numero = f"OT-{siguiente:06d}"
        super().save(*args, **kwargs)

    @property
    def costo_mano_obra(self):
        total = 0
        for asignacion in self.asignaciones.all():
            total += float(asignacion.horas_reales or 0) * float(asignacion.tecnico.tarifa_hora)
        return round(total, 2)

    @property
    def costo_materiales(self):
        total = sum(float(m.cantidad) * float(m.costo_unitario) for m in self.materiales.all())
        return round(total, 2)

    @property
    def costo_total(self):
        return round(self.costo_mano_obra + self.costo_materiales, 2)

    @property
    def en_backlog(self):
        return self.estado not in ("CERRADA", "CANCELADA")


class TareaOT(models.Model):
    orden_trabajo = models.ForeignKey(
        OrdenTrabajo, on_delete=models.CASCADE, related_name="tareas"
    )
    descripcion = models.CharField(max_length=255)
    completada = models.BooleanField(default=False)
    orden = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = "Tarea de OT"
        verbose_name_plural = "Tareas de OT"
        ordering = ["orden", "id"]

    def __str__(self):
        return self.descripcion


class AsignacionTecnico(models.Model):
    """Carga de trabajo de un técnico en una OT y fecha concretas."""

    orden_trabajo = models.ForeignKey(
        OrdenTrabajo, on_delete=models.CASCADE, related_name="asignaciones"
    )
    tecnico = models.ForeignKey(Tecnico, on_delete=models.PROTECT, related_name="asignaciones")
    fecha = models.DateField()
    horas_planificadas = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    horas_reales = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        verbose_name = "Asignación de técnico"
        verbose_name_plural = "Asignaciones de técnico"
        ordering = ["fecha"]

    def __str__(self):
        return f"{self.tecnico.codigo} en {self.orden_trabajo.numero} ({self.fecha})"


class MaterialUtilizado(models.Model):
    orden_trabajo = models.ForeignKey(
        OrdenTrabajo, on_delete=models.CASCADE, related_name="materiales"
    )
    material = models.ForeignKey(Material, on_delete=models.PROTECT, related_name="usos_en_ot")
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    costo_unitario = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text="Copiado del material al momento de registrar el consumo.",
    )
    fuente = models.CharField(
        max_length=20,
        choices=[
            ("STOCK_LOCAL", "Stock local"),
            ("TRASLADO", "Traslado entre almacenes"),
            ("COMPRA_NORMAL", "Compra normal"),
            ("COMPRA_EMERGENCIA", "Compra de emergencia"),
        ],
        default="STOCK_LOCAL",
    )

    class Meta:
        verbose_name = "Material utilizado"
        verbose_name_plural = "Materiales utilizados"

    def __str__(self):
        return f"{self.material.codigo} x{self.cantidad} en {self.orden_trabajo.numero}"


class IntentoReparacion(models.Model):
    """Historial de intentos: una OT puede requerir más de una intervención
    antes de resolver la falla definitivamente."""

    orden_trabajo = models.ForeignKey(
        OrdenTrabajo, on_delete=models.CASCADE, related_name="intentos"
    )
    numero_intento = models.PositiveSmallIntegerField()
    fecha = models.DateTimeField(auto_now_add=True)
    descripcion = models.TextField()
    resultado_exitoso = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Intento de reparación"
        verbose_name_plural = "Intentos de reparación"
        ordering = ["numero_intento"]
        unique_together = ("orden_trabajo", "numero_intento")

    def __str__(self):
        return f"{self.orden_trabajo.numero} - intento {self.numero_intento}"


class BitacoraOT(models.Model):
    """Trazabilidad/auditoría: cada cambio de estado o decisión relevante
    queda registrado para reconstruir el historial completo de la OT."""

    orden_trabajo = models.ForeignKey(
        OrdenTrabajo, on_delete=models.CASCADE, related_name="bitacora"
    )
    fecha = models.DateTimeField(auto_now_add=True)
    usuario = models.CharField(max_length=150, blank=True)
    evento = models.CharField(max_length=255)
    detalle = models.TextField(blank=True)

    class Meta:
        verbose_name = "Entrada de bitácora de OT"
        verbose_name_plural = "Bitácora de OT"
        ordering = ["fecha"]

    def __str__(self):
        return f"{self.orden_trabajo.numero}: {self.evento}"
