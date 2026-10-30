from rest_framework import viewsets
from .models import Especialidad, Habilidad, Tecnico
from .serializers import EspecialidadSerializer, HabilidadSerializer, TecnicoSerializer


class EspecialidadViewSet(viewsets.ModelViewSet):
    queryset = Especialidad.objects.all()
    serializer_class = EspecialidadSerializer


class HabilidadViewSet(viewsets.ModelViewSet):
    queryset = Habilidad.objects.all()
    serializer_class = HabilidadSerializer


class TecnicoViewSet(viewsets.ModelViewSet):
    queryset = Tecnico.objects.all().select_related("especialidad").prefetch_related("habilidades")
    serializer_class = TecnicoSerializer
    filterset_fields = ["especialidad", "disponible", "activo"]
    search_fields = ["codigo", "nombre"]
