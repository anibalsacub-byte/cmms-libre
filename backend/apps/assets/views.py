from rest_framework import viewsets
from apps.accounts.permissions import SoloAdministracionEscribe
from apps.companies.mixins import EmpresaScopedMixin
from .models import UbicacionTecnica, ClaseActivo, Activo
from .serializers import UbicacionTecnicaSerializer, ClaseActivoSerializer, ActivoSerializer


class UbicacionTecnicaViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = UbicacionTecnica.objects.all()
    serializer_class = UbicacionTecnicaSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["padre"]
    search_fields = ["codigo", "nombre"]


class ClaseActivoViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = ClaseActivo.objects.all()
    serializer_class = ClaseActivoSerializer
    permission_classes = [SoloAdministracionEscribe]
    search_fields = ["codigo", "nombre"]


class ActivoViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = Activo.objects.all().select_related("clase", "ubicacion_tecnica")
    serializer_class = ActivoSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["clase", "ubicacion_tecnica", "criticidad", "estado"]
    search_fields = ["codigo", "nombre", "numero_serie"]
