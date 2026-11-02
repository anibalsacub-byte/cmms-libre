from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management import call_command
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .serializers import MeSerializer, CambiarPasswordSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)


class CambiarPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CambiarPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data["password_actual"]):
            return Response(
                {"detail": "La contraseña actual no es correcta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nueva = serializer.validated_data["password_nueva"]
        try:
            validate_password(nueva, user=request.user)
        except ValidationError as exc:
            return Response({"detail": " ".join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(nueva)
        request.user.save(update_fields=["password"])

        perfil = request.user.perfil
        perfil.debe_cambiar_password = False
        perfil.save(update_fields=["debe_cambiar_password"])

        return Response(MeSerializer(request.user).data)


class SoloAdministrador(IsAuthenticated):
    """Solo el superusuario (el admin de esta instalación) puede disparar
    estas acciones: cargan o borran TODOS los datos."""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_superuser


class CargarDemoView(APIView):
    """Carga la empresa de ejemplo, solo si la instalación sigue vacía de
    datos propios (evita chocar con códigos ya usados)."""

    permission_classes = [SoloAdministrador]

    def post(self, request):
        from apps.assets.models import Activo

        if Activo.objects.exists():
            return Response(
                {
                    "detail": (
                        "Ya hay activos cargados en esta instalación. Usa "
                        "«Restablecer instalación» primero si quieres partir de cero "
                        "con los datos de demostración."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        call_command("seed_demo")
        return Response({"detail": "Datos de demostración cargados."})


class ReiniciarInstalacionView(APIView):
    """Borra TODOS los datos (activos, avisos, OT, inventario, usuarios...)
    y deja la instalación como recién instalada. Irreversible."""

    permission_classes = [SoloAdministrador]

    def post(self, request):
        if request.data.get("confirmar") != "BORRAR":
            return Response(
                {"detail": "Falta confirmar la acción."}, status=status.HTTP_400_BAD_REQUEST
            )

        call_command("reiniciar_instalacion")
        return Response({"detail": "Instalación restablecida."})
