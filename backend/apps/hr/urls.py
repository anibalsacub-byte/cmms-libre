from rest_framework.routers import DefaultRouter
from .views import EspecialidadViewSet, HabilidadViewSet, TecnicoViewSet

router = DefaultRouter()
router.register("especialidades", EspecialidadViewSet)
router.register("habilidades", HabilidadViewSet)
router.register("tecnicos", TecnicoViewSet)

urlpatterns = router.urls
