from rest_framework import serializers
from .models import (
    OrdenTrabajo,
    TareaOT,
    AsignacionTecnico,
    MaterialUtilizado,
    IntentoReparacion,
    BitacoraOT,
)


class TareaOTSerializer(serializers.ModelSerializer):
    class Meta:
        model = TareaOT
        fields = "__all__"
        extra_kwargs = {"orden_trabajo": {"required": False}}


class AsignacionTecnicoSerializer(serializers.ModelSerializer):
    tecnico_nombre = serializers.CharField(source="tecnico.nombre", read_only=True)

    class Meta:
        model = AsignacionTecnico
        fields = "__all__"
        extra_kwargs = {"orden_trabajo": {"required": False}}


class MaterialUtilizadoSerializer(serializers.ModelSerializer):
    material_codigo = serializers.CharField(source="material.codigo", read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = MaterialUtilizado
        fields = "__all__"
        extra_kwargs = {"orden_trabajo": {"required": False}}

    def get_subtotal(self, obj):
        return float(obj.cantidad) * float(obj.costo_unitario)


class IntentoReparacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntentoReparacion
        fields = "__all__"
        extra_kwargs = {"orden_trabajo": {"required": False}}


class BitacoraOTSerializer(serializers.ModelSerializer):
    class Meta:
        model = BitacoraOT
        fields = "__all__"
        read_only_fields = ["fecha"]
        extra_kwargs = {"orden_trabajo": {"required": False}}


class OrdenTrabajoSerializer(serializers.ModelSerializer):
    activo_codigo = serializers.CharField(source="activo.codigo", read_only=True)
    activo_nombre = serializers.CharField(source="activo.nombre", read_only=True)
    tecnico_principal_nombre = serializers.CharField(
        source="tecnico_principal.nombre", read_only=True, default=None
    )
    tareas = TareaOTSerializer(many=True, read_only=True)
    asignaciones = AsignacionTecnicoSerializer(many=True, read_only=True)
    materiales = MaterialUtilizadoSerializer(many=True, read_only=True)
    intentos = IntentoReparacionSerializer(many=True, read_only=True)
    bitacora = BitacoraOTSerializer(many=True, read_only=True)
    costo_mano_obra = serializers.FloatField(read_only=True)
    costo_materiales = serializers.FloatField(read_only=True)
    costo_total = serializers.FloatField(read_only=True)
    en_backlog = serializers.BooleanField(read_only=True)

    class Meta:
        model = OrdenTrabajo
        fields = "__all__"
        read_only_fields = ["numero", "fecha_creacion"]


class OrdenTrabajoListSerializer(serializers.ModelSerializer):
    """Versión liviana para listados/tablas."""

    activo_codigo = serializers.CharField(source="activo.codigo", read_only=True)
    costo_total = serializers.FloatField(read_only=True)
    en_backlog = serializers.BooleanField(read_only=True)

    class Meta:
        model = OrdenTrabajo
        fields = [
            "id",
            "numero",
            "activo",
            "activo_codigo",
            "tipo",
            "prioridad",
            "estado",
            "fecha_creacion",
            "fecha_planificada",
            "costo_total",
            "en_backlog",
        ]
