from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import (
    OrdenTrabajo,
    TareaOT,
    AsignacionTecnico,
    MaterialUtilizado,
    IntentoReparacion,
    BitacoraOT,
)
from .serializers import (
    OrdenTrabajoSerializer,
    OrdenTrabajoListSerializer,
    TareaOTSerializer,
    AsignacionTecnicoSerializer,
    MaterialUtilizadoSerializer,
    IntentoReparacionSerializer,
    BitacoraOTSerializer,
)


class OrdenTrabajoViewSet(viewsets.ModelViewSet):
    queryset = OrdenTrabajo.objects.all().select_related("activo", "tecnico_principal", "aviso")
    filterset_fields = ["estado", "tipo", "prioridad", "activo", "tecnico_principal"]
    search_fields = ["numero", "descripcion"]

    def get_serializer_class(self):
        if self.action == "list":
            return OrdenTrabajoListSerializer
        return OrdenTrabajoSerializer

    def perform_create(self, serializer):
        orden = serializer.save()
        BitacoraOT.objects.create(
            orden_trabajo=orden,
            usuario=self.request.data.get("usuario", ""),
            evento="OT creada",
        )

    @action(detail=True, methods=["post"], url_path="cambiar-estado")
    def cambiar_estado(self, request, pk=None):
        orden = self.get_object()
        nuevo_estado = request.data.get("estado")
        if nuevo_estado not in dict(OrdenTrabajo.ESTADO_CHOICES):
            return Response({"detail": "Estado inválido."}, status=status.HTTP_400_BAD_REQUEST)

        estado_anterior = orden.estado
        orden.estado = nuevo_estado
        if nuevo_estado == "EN_PROGRESO" and not orden.fecha_inicio:
            orden.fecha_inicio = timezone.now()
        if nuevo_estado == "CERRADA":
            orden.fecha_fin = timezone.now()
        orden.save()

        BitacoraOT.objects.create(
            orden_trabajo=orden,
            usuario=request.data.get("usuario", ""),
            evento=f"Estado: {estado_anterior} -> {nuevo_estado}",
            detalle=request.data.get("comentario", ""),
        )
        return Response(OrdenTrabajoSerializer(orden).data)

    @action(detail=True, methods=["post"])
    def cerrar(self, request, pk=None):
        orden = self.get_object()
        orden.estado = "CERRADA"
        orden.fecha_fin = timezone.now()
        orden.trabajo_realizado = request.data.get(
            "trabajo_realizado", orden.trabajo_realizado
        )
        orden.save()
        BitacoraOT.objects.create(
            orden_trabajo=orden,
            usuario=request.data.get("usuario", ""),
            evento="OT cerrada",
            detalle=request.data.get("comentario", ""),
        )
        return Response(OrdenTrabajoSerializer(orden).data)


class TareaOTViewSet(viewsets.ModelViewSet):
    queryset = TareaOT.objects.all()
    serializer_class = TareaOTSerializer
    filterset_fields = ["orden_trabajo", "completada"]


class AsignacionTecnicoViewSet(viewsets.ModelViewSet):
    queryset = AsignacionTecnico.objects.all().select_related("tecnico")
    serializer_class = AsignacionTecnicoSerializer
    filterset_fields = ["orden_trabajo", "tecnico", "fecha"]


class MaterialUtilizadoViewSet(viewsets.ModelViewSet):
    queryset = MaterialUtilizado.objects.all().select_related("material")
    serializer_class = MaterialUtilizadoSerializer
    filterset_fields = ["orden_trabajo", "material", "fuente"]


class IntentoReparacionViewSet(viewsets.ModelViewSet):
    queryset = IntentoReparacion.objects.all()
    serializer_class = IntentoReparacionSerializer
    filterset_fields = ["orden_trabajo"]


class BitacoraOTViewSet(viewsets.ModelViewSet):
    queryset = BitacoraOT.objects.all()
    serializer_class = BitacoraOTSerializer
    filterset_fields = ["orden_trabajo"]
