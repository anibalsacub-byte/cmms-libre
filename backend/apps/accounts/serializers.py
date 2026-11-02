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
    empresa_id = serializers.IntegerField(source="perfil.empresa_id", read_only=True)
    empresa_nombre = serializers.CharField(source="perfil.empresa.nombre", read_only=True, default=None)

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
            "empresa_id",
            "empresa_nombre",
        ]


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="usuario.username", read_only=True)

    class Meta:
        model = PerfilUsuario
        fields = "__all__"


class CambiarPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True)
    password_nueva = serializers.CharField(write_only=True, min_length=8)


class RegistrarEmpresaSerializer(serializers.Serializer):
    nombre_empresa = serializers.CharField(max_length=150)
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Ese usuario ya existe.")
        return value
