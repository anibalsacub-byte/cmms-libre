from rest_framework.routers import DefaultRouter
from .views import UbicacionTecnicaViewSet, ClaseActivoViewSet, ActivoViewSet

router = DefaultRouter()
router.register("ubicaciones-tecnicas", UbicacionTecnicaViewSet)
router.register("clases-activo", ClaseActivoViewSet)
router.register("activos", ActivoViewSet)

urlpatterns = router.urls
