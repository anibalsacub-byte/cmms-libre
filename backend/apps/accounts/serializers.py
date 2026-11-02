from rest_framework import serializers
from django.contrib.auth.models import User
from .models import PerfilUsuario


class MeSerializer(serializers.ModelSerializer):
    rol = serializers.CharField(source="perfil.rol", read_only=True)
    rol_display = serializers.CharField(source="perfil.get_rol_display", read_only=True)
    tecnico_id = serializers.IntegerField(source="perfil.tecnico_id", read_only=True)
    debe_cambiar_password = serializers.BooleanField(
        source="perfil.debe_cambiar_password", read_only=True
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "is_superuser",
            "rol",
            "rol_display",
            "tecnico_id",
            "debe_cambiar_password",
        ]


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="usuario.username", read_only=True)

    class Meta:
        model = PerfilUsuario
        fields = "__all__"


class CambiarPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True)
    password_nueva = serializers.CharField(write_only=True, min_length=8)
