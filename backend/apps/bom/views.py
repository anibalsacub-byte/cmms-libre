from rest_framework import viewsets
from .models import EquipoMaterial
from .serializers import EquipoMaterialSerializer


class EquipoMaterialViewSet(viewsets.ModelViewSet):
    queryset = EquipoMaterial.objects.all().select_related("activo", "material")
    serializer_class = EquipoMaterialSerializer
    filterset_fields = ["activo", "material"]
