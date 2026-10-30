from rest_framework import viewsets
from .models import UbicacionTecnica, ClaseActivo, Activo
from .serializers import UbicacionTecnicaSerializer, ClaseActivoSerializer, ActivoSerializer


class UbicacionTecnicaViewSet(viewsets.ModelViewSet):
    queryset = UbicacionTecnica.objects.all()
    serializer_class = UbicacionTecnicaSerializer
    filterset_fields = ["padre"]
    search_fields = ["codigo", "nombre"]


class ClaseActivoViewSet(viewsets.ModelViewSet):
    queryset = ClaseActivo.objects.all()
    serializer_class = ClaseActivoSerializer
    search_fields = ["codigo", "nombre"]


class ActivoViewSet(viewsets.ModelViewSet):
    queryset = Activo.objects.all().select_related("clase", "ubicacion_tecnica")
    serializer_class = ActivoSerializer
    filterset_fields = ["clase", "ubicacion_tecnica", "criticidad", "estado"]
    search_fields = ["codigo", "nombre", "numero_serie"]
