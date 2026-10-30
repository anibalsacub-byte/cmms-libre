from rest_framework import serializers
from .models import Sintoma, ModoFalla, MecanismoFalla, CausaFalla


class SintomaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sintoma
        fields = "__all__"


class ModoFallaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModoFalla
        fields = "__all__"


class MecanismoFallaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MecanismoFalla
        fields = "__all__"


class CausaFallaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CausaFalla
        fields = "__all__"
