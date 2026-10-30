from rest_framework import serializers
from django.contrib.auth.models import User
from .models import PerfilUsuario


class MeSerializer(serializers.ModelSerializer):
    rol = serializers.CharField(source="perfil.rol", read_only=True)
    rol_display = serializers.CharField(source="perfil.get_rol_display", read_only=True)
    tecnico_id = serializers.IntegerField(source="perfil.tecnico_id", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "is_superuser", "rol", "rol_display", "tecnico_id"]


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="usuario.username", read_only=True)

    class Meta:
        model = PerfilUsuario
        fields = "__all__"
