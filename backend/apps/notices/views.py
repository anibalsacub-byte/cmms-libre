from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import CualquieraCreaSoloAdministracionEdita
from apps.companies.mixins import EmpresaScopedMixin
from .models import Aviso
from .serializers import AvisoSerializer


class AvisoViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = Aviso.objects.all().select_related("activo")
    serializer_class = AvisoSerializer
    permission_classes = [CualquieraCreaSoloAdministracionEdita]
    filterset_fields = ["estado", "prioridad", "activo"]
    search_fields = ["numero", "descripcion"]

    @action(detail=True, methods=["post"], url_path="convertir-a-ot")
    def convertir_a_ot(self, request, pk=None):
        """Crea una OT a partir de este aviso (flujo aviso -> decisión -> OT)."""
        from apps.workorders.models import OrdenTrabajo, BitacoraOT

        aviso = self.get_object()
        if aviso.estado == "CONVERTIDO_OT":
            return Response(
                {"detail": "Este aviso ya fue convertido a una OT."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orden = OrdenTrabajo.objects.create(
            empresa=aviso.empresa,
            aviso=aviso,
            activo=aviso.activo,
            prioridad=aviso.prioridad,
            descripcion=aviso.descripcion,
            tipo=request.data.get("tipo", "CORRECTIVO"),
        )
        BitacoraOT.objects.create(
            orden_trabajo=orden,
            usuario=request.data.get("usuario", ""),
            evento="OT creada a partir de aviso",
            detalle=f"Origen: {aviso.numero}",
        )
        aviso.estado = "CONVERTIDO_OT"
        aviso.save(update_fields=["estado"])

        from apps.workorders.serializers import OrdenTrabajoSerializer

        return Response(OrdenTrabajoSerializer(orden).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def cerrar(self, request, pk=None):
        aviso = self.get_object()
        aviso.estado = "CERRADO"
        aviso.fecha_cierre = timezone.now()
        aviso.save(update_fields=["estado", "fecha_cierre"])
        return Response(self.get_serializer(aviso).data)
