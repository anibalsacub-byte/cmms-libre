from rest_framework.routers import DefaultRouter
from .views import OrdenCompraViewSet, ProveedorViewSet, SolicitudMaterialViewSet

router = DefaultRouter()
router.register("proveedores", ProveedorViewSet)
router.register("ordenes-compra", OrdenCompraViewSet)
router.register("solicitudes-material", SolicitudMaterialViewSet)

urlpatterns = router.urls
