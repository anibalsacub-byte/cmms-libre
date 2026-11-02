from rest_framework import viewsets
from apps.accounts.permissions import SoloAdministracionEscribe
from apps.companies.mixins import EmpresaScopedMixin
from .models import EquipoMaterial
from .serializers import EquipoMaterialSerializer


class EquipoMaterialViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = EquipoMaterial.objects.all().select_related("activo", "material")
    serializer_class = EquipoMaterialSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["activo", "material"]
    empresa_lookup = "activo__empresa"
    parent_field = "activo"
