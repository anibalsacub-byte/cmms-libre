from rest_framework.routers import DefaultRouter
from .views import EquipoMaterialViewSet

router = DefaultRouter()
router.register("repuestos-activo", EquipoMaterialViewSet)

urlpatterns = router.urls
