from rest_framework import serializers
from .models import Aviso


class AvisoSerializer(serializers.ModelSerializer):
    activo_codigo = serializers.CharField(source="activo.codigo", read_only=True)
    activo_nombre = serializers.CharField(source="activo.nombre", read_only=True)

    class Meta:
        model = Aviso
        fields = "__all__"
        read_only_fields = ["numero", "fecha_reporte", "empresa"]
