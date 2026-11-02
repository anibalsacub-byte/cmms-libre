from django.db.models import Q
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser
from apps.accounts.permissions import TecnicoEscribeAdministracionGestiona
from .models import Adjunto
from .serializers import AdjuntoSerializer


class AdjuntoViewSet(viewsets.ModelViewSet):
    queryset = Adjunto.objects.all()
    serializer_class = AdjuntoSerializer
    permission_classes = [TecnicoEscribeAdministracionGestiona]
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ["aviso", "orden_trabajo"]

    def _empresa(self):
        perfil = getattr(self.request.user, "perfil", None)
        return perfil.empresa if perfil else None

    def get_queryset(self):
        empresa = self._empresa()
        if empresa is None:
            return Adjunto.objects.none()
        return Adjunto.objects.filter(
            Q(aviso__empresa=empresa) | Q(orden_trabajo__empresa=empresa)
        )

    def perform_create(self, serializer):
        empresa = self._empresa()
        aviso = serializer.validated_data.get("aviso")
        orden_trabajo = serializer.validated_data.get("orden_trabajo")
        padre = aviso or orden_trabajo
        if padre is None or getattr(padre, "empresa_id", None) != getattr(empresa, "id", None):
            raise PermissionDenied("Ese aviso u OT pertenece a otra empresa.")
        serializer.save(subido_por=self.request.user.username)
