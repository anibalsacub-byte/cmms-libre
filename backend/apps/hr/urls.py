from rest_framework.routers import DefaultRouter
from .views import AusenciaViewSet, EspecialidadViewSet, HabilidadViewSet, TecnicoViewSet

router = DefaultRouter()
router.register("especialidades", EspecialidadViewSet)
router.register("habilidades", HabilidadViewSet)
router.register("tecnicos", TecnicoViewSet)
router.register("ausencias", AusenciaViewSet, basename="ausencia")

urlpatterns = router.urls
