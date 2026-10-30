from rest_framework import serializers
from .models import LineaProduccion, RegistroProduccion, ImpactoOperativoFalla


class LineaProduccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LineaProduccion
        fields = "__all__"


class RegistroProduccionSerializer(serializers.ModelSerializer):
    disponibilidad = serializers.FloatField(read_only=True)
    rendimiento = serializers.FloatField(read_only=True)
    calidad = serializers.FloatField(read_only=True)
    oee = serializers.FloatField(read_only=True)
    linea_nombre = serializers.CharField(source="linea.nombre", read_only=True)

    class Meta:
        model = RegistroProduccion
        fields = "__all__"


class ImpactoOperativoFallaSerializer(serializers.ModelSerializer):
    aviso_numero = serializers.CharField(source="aviso.numero", read_only=True)
    linea_nombre = serializers.CharField(source="linea.nombre", read_only=True)

    class Meta:
        model = ImpactoOperativoFalla
        fields = "__all__"
