from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management import call_command
from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from .serializers import (
    MeSerializer,
    CambiarPasswordSerializer,
    RegistrarEmpresaSerializer,
    UsuarioSerializer,
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


class UsuarioViewSet(viewsets.ModelViewSet):
    """El Administrador de la empresa crea y gestiona las cuentas de sus
    técnicos, planificadores, supervisores, etc. Cada uno entra con su
    propio usuario y solo puede hacer lo que su rol permite; si alguien
    necesita un cambio que su rol no permite, se lo pide al Administrador,
    que sí tiene acceso a todo."""

    serializer_class = UsuarioSerializer
    permission_classes = [SoloAdminDeEmpresa]

    def get_queryset(self):
        empresa = self.request.user.perfil.empresa
        return (
            User.objects.filter(perfil__empresa=empresa)
            .select_related("perfil", "perfil__tecnico")
            .order_by("username")
        )

    def _verificar_tecnico(self, tecnico, empresa):
        if tecnico is not None and tecnico.empresa_id != empresa.id:
            raise PermissionDenied("Ese técnico pertenece a otra empresa.")

    def perform_create(self, serializer):
        empresa = self.request.user.perfil.empresa
        password = serializer.validated_data.pop("password", None)
        perfil_data = serializer.validated_data.pop("perfil", {})
        if not password:
            raise DRFValidationError({"password": ["La contraseña es obligatoria al crear un usuario."]})
        try:
            validate_password(password)
        except ValidationError as exc:
            raise DRFValidationError({"password": exc.messages})

        tecnico = perfil_data.get("tecnico")
        self._verificar_tecnico(tecnico, empresa)

        user = User.objects.create_user(serializer.validated_data["username"], password=password)
        perfil, _ = PerfilUsuario.objects.update_or_create(
            usuario=user,
            defaults={
                "empresa": empresa,
                "rol": perfil_data.get("rol", "SOLO_LECTURA"),
                "tecnico": tecnico,
                "debe_cambiar_password": True,
            },
        )
        user.perfil = perfil
        serializer.instance = user

    def perform_update(self, serializer):
        empresa = self.request.user.perfil.empresa
        password = serializer.validated_data.pop("password", None)
        perfil_data = serializer.validated_data.pop("perfil", {})

        if password:
            try:
                validate_password(password)
            except ValidationError as exc:
                raise DRFValidationError({"password": exc.messages})

        user = serializer.save()

        actualizaciones = {}
        if "rol" in perfil_data:
            actualizaciones["rol"] = perfil_data["rol"]
        if "tecnico" in perfil_data:
            tecnico = perfil_data["tecnico"]
            self._verificar_tecnico(tecnico, empresa)
            actualizaciones["tecnico"] = tecnico
        if password:
            actualizaciones["debe_cambiar_password"] = True
        if actualizaciones:
            PerfilUsuario.objects.filter(usuario=user).update(**actualizaciones)

        if password:
            user.set_password(password)
            user.save(update_fields=["password"])

    def perform_destroy(self, instance):
        if instance == self.request.user:
            raise PermissionDenied("No puedes desactivar tu propia cuenta.")
        instance.is_active = False
        instance.save(update_fields=["is_active"])
