from rest_framework import serializers
from .models import EquipoMaterial


class EquipoMaterialSerializer(serializers.ModelSerializer):
    material_codigo = serializers.CharField(source="material.codigo", read_only=True)
    material_descripcion = serializers.CharField(source="material.descripcion", read_only=True)
    activo_codigo = serializers.CharField(source="activo.codigo", read_only=True)

    class Meta:
        model = EquipoMaterial
        fields = "__all__"
