from rest_framework.routers import DefaultRouter
from .views import SintomaViewSet, ModoFallaViewSet, MecanismoFallaViewSet, CausaFallaViewSet

router = DefaultRouter()
router.register("sintomas", SintomaViewSet)
router.register("modos-falla", ModoFallaViewSet)
router.register("mecanismos-falla", MecanismoFallaViewSet)
router.register("causas-falla", CausaFallaViewSet)

urlpatterns = router.urls
