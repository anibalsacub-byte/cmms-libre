from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    OrdenTrabajoViewSet,
    TareaOTViewSet,
    AsignacionTecnicoViewSet,
    MaterialUtilizadoViewSet,
    IntentoReparacionViewSet,
    BitacoraOTViewSet,
    PlanificacionSemanaView,
)

router = DefaultRouter()
router.register("ordenes", OrdenTrabajoViewSet, basename="ordentrabajo")
router.register("tareas", TareaOTViewSet)
router.register("asignaciones", AsignacionTecnicoViewSet)
router.register("materiales-utilizados", MaterialUtilizadoViewSet)
router.register("intentos", IntentoReparacionViewSet)
router.register("bitacora", BitacoraOTViewSet)

urlpatterns = [
    path("planificacion/semana/", PlanificacionSemanaView.as_view(), name="planificacion-semana"),
] + router.urls
