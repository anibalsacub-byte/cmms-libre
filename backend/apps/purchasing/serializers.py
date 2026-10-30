from rest_framework import serializers
from .models import OrdenCompra, SolicitudMaterial


class OrdenCompraSerializer(serializers.ModelSerializer):
    material_codigo = serializers.CharField(source="material.codigo", read_only=True)

    class Meta:
        model = OrdenCompra
        fields = "__all__"
        read_only_fields = ["numero", "fecha_solicitud"]


class SolicitudMaterialSerializer(serializers.ModelSerializer):
    material_codigo = serializers.CharField(source="material.codigo", read_only=True)
    orden_trabajo_numero = serializers.CharField(source="orden_trabajo.numero", read_only=True)

    class Meta:
        model = SolicitudMaterial
        fields = "__all__"
