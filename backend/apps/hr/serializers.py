from rest_framework import serializers
from .models import Ausencia, Especialidad, Habilidad, Tecnico


class EspecialidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especialidad
        fields = "__all__"


class HabilidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Habilidad
        fields = "__all__"


class TecnicoSerializer(serializers.ModelSerializer):
    especialidad_nombre = serializers.CharField(source="especialidad.nombre", read_only=True)
    habilidades_nombres = serializers.SlugRelatedField(
        source="habilidades", slug_field="nombre", many=True, read_only=True
    )

    class Meta:
        model = Tecnico
        fields = "__all__"
        read_only_fields = ["empresa"]


class AusenciaSerializer(serializers.ModelSerializer):
    tecnico_codigo = serializers.CharField(source="tecnico.codigo", read_only=True)
    tecnico_nombre = serializers.CharField(source="tecnico.nombre", read_only=True)

    class Meta:
        model = Ausencia
        fields = "__all__"
