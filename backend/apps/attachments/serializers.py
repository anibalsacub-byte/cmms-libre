from rest_framework import serializers
from .models import Adjunto


class AdjuntoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Adjunto
        fields = "__all__"
        read_only_fields = ["subido_en"]

    def validate(self, attrs):
        aviso = attrs.get("aviso") or getattr(self.instance, "aviso", None)
        orden_trabajo = attrs.get("orden_trabajo") or getattr(self.instance, "orden_trabajo", None)
        if not aviso and not orden_trabajo:
            raise serializers.ValidationError(
                "Debes indicar un aviso o una orden de trabajo para el adjunto."
            )
        return attrs
