from rest_framework.routers import DefaultRouter
from .views import (
    AlmacenViewSet,
    GrupoMaterialViewSet,
    MaterialViewSet,
    StockAlmacenViewSet,
    MovimientoStockViewSet,
    TrasladoAlmacenViewSet,
)

router = DefaultRouter()
router.register("almacenes", AlmacenViewSet)
router.register("grupos-material", GrupoMaterialViewSet)
router.register("materiales", MaterialViewSet)
router.register("stock", StockAlmacenViewSet)
router.register("movimientos", MovimientoStockViewSet)
router.register("traslados", TrasladoAlmacenViewSet)

urlpatterns = router.urls
