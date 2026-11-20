from rest_framework import serializers
from .models import OrdenCompra, Proveedor, SolicitudMaterial


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = "__all__"
        read_only_fields = ["empresa"]


class OrdenCompraSerializer(serializers.ModelSerializer):
    material_codigo = serializers.CharField(source="material.codigo", read_only=True)
    almacen_destino_codigo = serializers.CharField(source="almacen_destino.codigo", read_only=True)
    proveedor_registrado_nombre = serializers.CharField(
        source="proveedor_registrado.nombre", read_only=True, default=None
    )

    class Meta:
        model = OrdenCompra
        fields = "__all__"
        read_only_fields = ["numero", "fecha_solicitud", "fecha_recepcion", "estado"]

    def validate(self, data):
        proveedor_registrado = data.get("proveedor_registrado")
        if proveedor_registrado and not data.get("proveedor"):
            data["proveedor"] = proveedor_registrado.nombre
        return data


class SolicitudMaterialSerializer(serializers.ModelSerializer):
    material_codigo = serializers.CharField(source="material.codigo", read_only=True)
    orden_trabajo_numero = serializers.CharField(source="orden_trabajo.numero", read_only=True)
    orden_compra_numero = serializers.CharField(source="orden_compra.numero", read_only=True, default=None)

    class Meta:
        model = SolicitudMaterial
        fields = "__all__"
        read_only_fields = ["orden_compra"]
