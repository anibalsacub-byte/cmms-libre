from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management import call_command
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework.authtoken.models import Token
from .serializers import (
    MeSerializer,
    CambiarPasswordSerializer,
    RegistrarEmpresaSerializer,
)
from .models import PerfilUsuario


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


class RegistrarEmpresaView(APIView):
    """Auto-registro: crea una empresa nueva (espacio de datos aislado) y a
    su primer usuario, como Administrador de esa empresa. Pensado para que
    cada alumno/grupo/cliente cree la suya sin intervención manual."""

    permission_classes = [AllowAny]

    def post(self, request):
        from apps.companies.models import Empresa

        serializer = RegistrarEmpresaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data

        try:
            validate_password(datos["password"])
        except ValidationError as exc:
            return Response({"detail": " ".join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        empresa = Empresa.objects.create(nombre=datos["nombre_empresa"])
        user = User.objects.create_user(datos["username"], password=datos["password"])
        perfil, _ = PerfilUsuario.objects.update_or_create(
            usuario=user, defaults={"rol": "ADMINISTRADOR", "empresa": empresa, "debe_cambiar_password": False}
        )
        user.perfil = perfil  # evita que el serializer lea el perfil viejo cacheado en `user`
        token, _ = Token.objects.get_or_create(user=user)

        return Response({"token": token.key, "me": MeSerializer(user).data}, status=status.HTTP_201_CREATED)


class SoloAdminDeEmpresa(IsAuthenticated):
    """Solo el Administrador de SU PROPIA empresa puede disparar estas
    acciones (cargar demo / restablecer): nunca tocan datos de otra."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        perfil = getattr(request.user, "perfil", None)
        return bool(perfil and perfil.empresa_id and perfil.rol == "ADMINISTRADOR")


class CargarDemoView(APIView):
    """Carga la empresa de ejemplo dentro de LA EMPRESA del usuario, solo si
    esta sigue vacía de datos propios (evita chocar con códigos ya usados)."""

    permission_classes = [SoloAdminDeEmpresa]

    def post(self, request):
        from apps.assets.models import Activo

        empresa = request.user.perfil.empresa
        if Activo.objects.filter(empresa=empresa).exists():
            return Response(
                {
                    "detail": (
                        "Ya hay activos cargados en esta empresa. Usa "
                        "«Restablecer instalación» primero si quieres partir de cero "
                        "con los datos de demostración."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        call_command("seed_demo", empresa_id=empresa.id)
        return Response({"detail": "Datos de demostración cargados."})


class ReiniciarInstalacionView(APIView):
    """Borra TODOS los datos de LA EMPRESA del usuario (activos, avisos, OT,
    inventario...). No borra la cuenta ni otras empresas. Irreversible."""

    permission_classes = [SoloAdminDeEmpresa]

    def post(self, request):
        from apps.companies.services import borrar_datos_empresa

        if request.data.get("confirmar") != "BORRAR":
            return Response(
                {"detail": "Falta confirmar la acción."}, status=status.HTTP_400_BAD_REQUEST
            )

        borrar_datos_empresa(request.user.perfil.empresa)
        return Response({"detail": "Los datos de tu empresa fueron borrados."})
