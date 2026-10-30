from rest_framework import viewsets
from apps.accounts.permissions import SoloAdministracionEscribe
from .models import Especialidad, Habilidad, Tecnico
from .serializers import EspecialidadSerializer, HabilidadSerializer, TecnicoSerializer


class EspecialidadViewSet(viewsets.ModelViewSet):
    queryset = Especialidad.objects.all()
    serializer_class = EspecialidadSerializer
    permission_classes = [SoloAdministracionEscribe]


class HabilidadViewSet(viewsets.ModelViewSet):
    queryset = Habilidad.objects.all()
    serializer_class = HabilidadSerializer
    permission_classes = [SoloAdministracionEscribe]


class TecnicoViewSet(viewsets.ModelViewSet):
    queryset = Tecnico.objects.all().select_related("especialidad").prefetch_related("habilidades")
    serializer_class = TecnicoSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["especialidad", "disponible", "activo"]
    search_fields = ["codigo", "nombre"]
