from rest_framework import viewsets
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

    def perform_create(self, serializer):
        serializer.save(subido_por=self.request.user.username)
