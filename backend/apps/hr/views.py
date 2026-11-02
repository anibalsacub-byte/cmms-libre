from rest_framework import viewsets
from apps.accounts.permissions import SoloAdministracionEscribe, SoloSuperusuarioEscribe
from apps.companies.mixins import EmpresaScopedMixin
from .models import Especialidad, Habilidad, Tecnico
from .serializers import EspecialidadSerializer, HabilidadSerializer, TecnicoSerializer


class EspecialidadViewSet(viewsets.ModelViewSet):
    queryset = Especialidad.objects.all()
    serializer_class = EspecialidadSerializer
    permission_classes = [SoloSuperusuarioEscribe]


class HabilidadViewSet(viewsets.ModelViewSet):
    queryset = Habilidad.objects.all()
    serializer_class = HabilidadSerializer
    permission_classes = [SoloSuperusuarioEscribe]


class TecnicoViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = Tecnico.objects.all().select_related("especialidad").prefetch_related("habilidades")
    serializer_class = TecnicoSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["especialidad", "disponible", "activo"]
    search_fields = ["codigo", "nombre"]
