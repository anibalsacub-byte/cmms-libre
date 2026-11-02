from rest_framework import viewsets
from apps.accounts.permissions import SoloAdministracionEscribe
from apps.companies.mixins import EmpresaScopedMixin
from .models import LineaProduccion, RegistroProduccion, ImpactoOperativoFalla
from .serializers import (
    LineaProduccionSerializer,
    RegistroProduccionSerializer,
    ImpactoOperativoFallaSerializer,
)


class LineaProduccionViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = LineaProduccion.objects.all()
    serializer_class = LineaProduccionSerializer
    permission_classes = [SoloAdministracionEscribe]


class RegistroProduccionViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = RegistroProduccion.objects.all().select_related("linea")
    serializer_class = RegistroProduccionSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["linea", "fecha"]
    empresa_lookup = "linea__empresa"
    parent_field = "linea"


class ImpactoOperativoFallaViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = ImpactoOperativoFalla.objects.all().select_related("aviso", "linea")
    serializer_class = ImpactoOperativoFallaSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["linea", "aviso"]
    empresa_lookup = "linea__empresa"
    parent_field = "linea"
