from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import CalidadDatosView, RegistroAuditoriaViewSet

router = DefaultRouter()
router.register("auditoria", RegistroAuditoriaViewSet, basename="auditoria")

urlpatterns = [
    path("calidad-datos/", CalidadDatosView.as_view(), name="calidad-datos"),
] + router.urls
