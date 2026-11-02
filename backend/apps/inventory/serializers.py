from rest_framework import serializers
from .models import Almacen, GrupoMaterial, Material, StockAlmacen, MovimientoStock, TrasladoAlmacen


class AlmacenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Almacen
        fields = "__all__"
        read_only_fields = ["empresa"]


class GrupoMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrupoMaterial
        fields = "__all__"


class MaterialSerializer(serializers.ModelSerializer):
    grupo_nombre = serializers.CharField(source="grupo.nombre", read_only=True)
    stock_total = serializers.SerializerMethodField()

    class Meta:
        model = Material
        fields = "__all__"
        read_only_fields = ["empresa"]

    def get_stock_total(self, obj):
        return sum(float(s.cantidad) for s in obj.stocks.all())


class StockAlmacenSerializer(serializers.ModelSerializer):
    material_codigo = serializers.CharField(source="material.codigo", read_only=True)
    almacen_codigo = serializers.CharField(source="almacen.codigo", read_only=True)
    bajo_minimo = serializers.BooleanField(read_only=True)

    class Meta:
        model = StockAlmacen
        fields = "__all__"


class MovimientoStockSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimientoStock
        fields = "__all__"
        read_only_fields = ["fecha"]


class TrasladoAlmacenSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrasladoAlmacen
        fields = "__all__"
        read_only_fields = ["fecha_solicitud"]
