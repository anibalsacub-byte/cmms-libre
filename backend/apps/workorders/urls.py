from rest_framework.routers import DefaultRouter
from .views import (
    OrdenTrabajoViewSet,
    TareaOTViewSet,
    AsignacionTecnicoViewSet,
    MaterialUtilizadoViewSet,
    IntentoReparacionViewSet,
    BitacoraOTViewSet,
)

router = DefaultRouter()
router.register("ordenes", OrdenTrabajoViewSet, basename="ordentrabajo")
router.register("tareas", TareaOTViewSet)
router.register("asignaciones", AsignacionTecnicoViewSet)
router.register("materiales-utilizados", MaterialUtilizadoViewSet)
router.register("intentos", IntentoReparacionViewSet)
router.register("bitacora", BitacoraOTViewSet)

urlpatterns = router.urls
