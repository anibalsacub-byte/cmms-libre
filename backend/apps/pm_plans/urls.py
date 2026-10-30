from rest_framework.routers import DefaultRouter
from .views import PlanPreventivoViewSet

router = DefaultRouter()
router.register("planes", PlanPreventivoViewSet)

urlpatterns = router.urls
