from rest_framework.routers import DefaultRouter
from .views import OrdenCompraViewSet, SolicitudMaterialViewSet

router = DefaultRouter()
router.register("ordenes-compra", OrdenCompraViewSet)
router.register("solicitudes-material", SolicitudMaterialViewSet)

urlpatterns = router.urls
