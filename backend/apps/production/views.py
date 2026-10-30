from rest_framework import viewsets
from .models import LineaProduccion, RegistroProduccion, ImpactoOperativoFalla
from .serializers import (
    LineaProduccionSerializer,
    RegistroProduccionSerializer,
    ImpactoOperativoFallaSerializer,
)


class LineaProduccionViewSet(viewsets.ModelViewSet):
    queryset = LineaProduccion.objects.all()
    serializer_class = LineaProduccionSerializer


class RegistroProduccionViewSet(viewsets.ModelViewSet):
    queryset = RegistroProduccion.objects.all().select_related("linea")
    serializer_class = RegistroProduccionSerializer
    filterset_fields = ["linea", "fecha"]


class ImpactoOperativoFallaViewSet(viewsets.ModelViewSet):
    queryset = ImpactoOperativoFalla.objects.all().select_related("aviso", "linea")
    serializer_class = ImpactoOperativoFallaSerializer
    filterset_fields = ["linea", "aviso"]
