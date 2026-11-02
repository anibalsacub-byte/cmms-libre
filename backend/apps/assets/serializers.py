from rest_framework import serializers
from .models import UbicacionTecnica, ClaseActivo, Activo, FichaTecnicaCampo


class UbicacionTecnicaSerializer(serializers.ModelSerializer):
    ruta = serializers.CharField(read_only=True)

    class Meta:
        model = UbicacionTecnica
        fields = "__all__"
        read_only_fields = ["empresa"]


class ClaseActivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClaseActivo
        fields = "__all__"
        read_only_fields = ["empresa"]


class FichaTecnicaCampoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FichaTecnicaCampo
        fields = ["id", "atributo", "valor", "unidad"]


class ActivoSerializer(serializers.ModelSerializer):
    clase_nombre = serializers.CharField(source="clase.nombre", read_only=True)
    ubicacion_tecnica_nombre = serializers.CharField(
        source="ubicacion_tecnica.nombre", read_only=True
    )
    ficha_tecnica = FichaTecnicaCampoSerializer(many=True, read_only=True)

    class Meta:
        model = Activo
        fields = "__all__"
        read_only_fields = ["empresa"]
