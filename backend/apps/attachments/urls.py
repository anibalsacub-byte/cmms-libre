from rest_framework.routers import DefaultRouter
from .views import AdjuntoViewSet

router = DefaultRouter()
router.register("adjuntos", AdjuntoViewSet)

urlpatterns = router.urls
