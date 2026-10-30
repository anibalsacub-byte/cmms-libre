from rest_framework import viewsets
from apps.accounts.permissions import SoloAdministracionEscribe
from .models import OrdenCompra, SolicitudMaterial
from .serializers import OrdenCompraSerializer, SolicitudMaterialSerializer


class OrdenCompraViewSet(viewsets.ModelViewSet):
    queryset = OrdenCompra.objects.all().select_related("material", "orden_trabajo")
    serializer_class = OrdenCompraSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["tipo", "estado"]
    search_fields = ["numero", "proveedor"]


class SolicitudMaterialViewSet(viewsets.ModelViewSet):
    queryset = SolicitudMaterial.objects.all().select_related("material", "orden_trabajo")
    serializer_class = SolicitudMaterialSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["fuente", "estado", "orden_trabajo"]
