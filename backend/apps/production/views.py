from rest_framework import viewsets
from apps.accounts.permissions import SoloAdministracionEscribe
from .models import LineaProduccion, RegistroProduccion, ImpactoOperativoFalla
from .serializers import (
    LineaProduccionSerializer,
    RegistroProduccionSerializer,
    ImpactoOperativoFallaSerializer,
)


class LineaProduccionViewSet(viewsets.ModelViewSet):
    queryset = LineaProduccion.objects.all()
    serializer_class = LineaProduccionSerializer
    permission_classes = [SoloAdministracionEscribe]


class RegistroProduccionViewSet(viewsets.ModelViewSet):
    queryset = RegistroProduccion.objects.all().select_related("linea")
    serializer_class = RegistroProduccionSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["linea", "fecha"]


class ImpactoOperativoFallaViewSet(viewsets.ModelViewSet):
    queryset = ImpactoOperativoFalla.objects.all().select_related("aviso", "linea")
    serializer_class = ImpactoOperativoFallaSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["linea", "aviso"]
