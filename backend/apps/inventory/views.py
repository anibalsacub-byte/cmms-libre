from rest_framework import viewsets
from apps.accounts.permissions import SoloAdministracionEscribe
from .models import Almacen, GrupoMaterial, Material, StockAlmacen, MovimientoStock, TrasladoAlmacen
from .serializers import (
    AlmacenSerializer,
    GrupoMaterialSerializer,
    MaterialSerializer,
    StockAlmacenSerializer,
    MovimientoStockSerializer,
    TrasladoAlmacenSerializer,
)


class AlmacenViewSet(viewsets.ModelViewSet):
    queryset = Almacen.objects.all()
    serializer_class = AlmacenSerializer
    permission_classes = [SoloAdministracionEscribe]
    search_fields = ["codigo", "nombre"]


class GrupoMaterialViewSet(viewsets.ModelViewSet):
    queryset = GrupoMaterial.objects.all()
    serializer_class = GrupoMaterialSerializer
    permission_classes = [SoloAdministracionEscribe]


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.all().prefetch_related("stocks")
    serializer_class = MaterialSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["grupo", "estado"]
    search_fields = ["codigo", "descripcion"]


class StockAlmacenViewSet(viewsets.ModelViewSet):
    queryset = StockAlmacen.objects.all().select_related("material", "almacen")
    serializer_class = StockAlmacenSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["almacen", "material"]


class MovimientoStockViewSet(viewsets.ModelViewSet):
    queryset = MovimientoStock.objects.all().select_related("material", "almacen")
    serializer_class = MovimientoStockSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["tipo", "almacen", "material"]


class TrasladoAlmacenViewSet(viewsets.ModelViewSet):
    queryset = TrasladoAlmacen.objects.all().select_related(
        "material", "almacen_origen", "almacen_destino"
    )
    serializer_class = TrasladoAlmacenSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["estado"]
