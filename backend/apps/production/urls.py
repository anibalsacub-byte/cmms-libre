from rest_framework.routers import DefaultRouter
from .views import LineaProduccionViewSet, RegistroProduccionViewSet, ImpactoOperativoFallaViewSet

router = DefaultRouter()
router.register("lineas", LineaProduccionViewSet)
router.register("registros", RegistroProduccionViewSet)
router.register("impactos-falla", ImpactoOperativoFallaViewSet)

urlpatterns = router.urls
