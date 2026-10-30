from rest_framework import viewsets
from .models import OrdenCompra, SolicitudMaterial
from .serializers import OrdenCompraSerializer, SolicitudMaterialSerializer


class OrdenCompraViewSet(viewsets.ModelViewSet):
    queryset = OrdenCompra.objects.all().select_related("material", "orden_trabajo")
    serializer_class = OrdenCompraSerializer
    filterset_fields = ["tipo", "estado"]
    search_fields = ["numero", "proveedor"]


class SolicitudMaterialViewSet(viewsets.ModelViewSet):
    queryset = SolicitudMaterial.objects.all().select_related("material", "orden_trabajo")
    serializer_class = SolicitudMaterialSerializer
    filterset_fields = ["fuente", "estado", "orden_trabajo"]
