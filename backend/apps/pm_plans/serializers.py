from rest_framework import serializers
from .models import PlanPreventivo


class PlanPreventivoSerializer(serializers.ModelSerializer):
    activo_codigo = serializers.CharField(source="activo.codigo", read_only=True)
    activo_nombre = serializers.CharField(source="activo.nombre", read_only=True)
    vencido = serializers.SerializerMethodField()

    class Meta:
        model = PlanPreventivo
        fields = "__all__"
        read_only_fields = ["ultima_generacion"]

    def get_vencido(self, obj):
        return obj.esta_vencido()
