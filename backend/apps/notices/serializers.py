from rest_framework import serializers
from .models import Aviso


class AvisoSerializer(serializers.ModelSerializer):
    activo_codigo = serializers.CharField(source="activo.codigo", read_only=True)
    activo_nombre = serializers.CharField(source="activo.nombre", read_only=True)
    sintoma_nombre = serializers.CharField(source="sintoma.nombre", read_only=True, default=None)
    modo_falla_codigo = serializers.CharField(source="modo_falla.codigo", read_only=True, default=None)
    modo_falla_nombre = serializers.CharField(source="modo_falla.nombre", read_only=True, default=None)
    mecanismo_falla_codigo = serializers.CharField(
        source="mecanismo_falla.codigo", read_only=True, default=None
    )
    mecanismo_falla_nombre = serializers.CharField(
        source="mecanismo_falla.nombre", read_only=True, default=None
    )
    causa_falla_codigo = serializers.CharField(
        source="causa_falla.codigo", read_only=True, default=None
    )
    causa_falla_nombre = serializers.CharField(
        source="causa_falla.nombre", read_only=True, default=None
    )

    class Meta:
        model = Aviso
        fields = "__all__"
        read_only_fields = ["numero", "fecha_reporte", "empresa"]
