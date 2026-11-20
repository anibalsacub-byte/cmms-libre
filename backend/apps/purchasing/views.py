from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import SoloAdministracionEscribe, SoloAdministracionEscribeAdminElimina
from apps.companies.mixins import EmpresaScopedMixin
from apps.inventory.models import Almacen, StockAlmacen
from .models import OrdenCompra, Proveedor, SolicitudMaterial
from .serializers import OrdenCompraSerializer, ProveedorSerializer, SolicitudMaterialSerializer


class ProveedorViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    permission_classes = [SoloAdministracionEscribeAdminElimina]
    search_fields = ["nombre", "contacto"]


class OrdenCompraViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    """Solicitada -> aprobada -> en tránsito -> recibida (o cancelada). Al
    marcarla como recibida se suma el stock en el almacén de destino y se
    avisa a las solicitudes de material que la originaron."""

    queryset = OrdenCompra.objects.all().select_related(
        "material", "orden_trabajo", "almacen_destino", "proveedor_registrado"
    )
    serializer_class = OrdenCompraSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["tipo", "estado"]
    search_fields = ["numero", "proveedor"]
    empresa_lookup = "material__empresa"
    parent_field = "material"

    @action(detail=True, methods=["post"], url_path="cambiar-estado")
    def cambiar_estado(self, request, pk=None):
        orden = self.get_object()
        nuevo_estado = request.data.get("estado")
        if nuevo_estado not in dict(OrdenCompra.ESTADO_CHOICES):
            return Response({"detail": "Estado inválido."}, status=status.HTTP_400_BAD_REQUEST)
        if orden.estado in ("RECIBIDA", "CANCELADA"):
            return Response(
                {"detail": "Esta orden de compra ya se cerró."}, status=status.HTTP_400_BAD_REQUEST
            )

        if nuevo_estado == "RECIBIDA":
            stock, _ = StockAlmacen.objects.get_or_create(
                material=orden.material, almacen=orden.almacen_destino
            )
            stock.cantidad += orden.cantidad
            stock.save(update_fields=["cantidad"])
            orden.fecha_recepcion = timezone.now()
            orden.solicitudes.exclude(estado="CANCELADA").update(estado="DISPONIBLE")

        orden.estado = nuevo_estado
        orden.save()
        return Response(OrdenCompraSerializer(orden).data)


class SolicitudMaterialViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = SolicitudMaterial.objects.all().select_related(
        "material", "orden_trabajo", "orden_compra"
    )
    serializer_class = SolicitudMaterialSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["fuente", "estado", "orden_trabajo"]
    empresa_lookup = "orden_trabajo__empresa"
    parent_field = "orden_trabajo"

    @action(detail=True, methods=["post"], url_path="generar-orden-compra")
    def generar_orden_compra(self, request, pk=None):
        solicitud = self.get_object()
        if solicitud.fuente not in ("COMPRA_NORMAL", "COMPRA_EMERGENCIA"):
            return Response(
                {"detail": "Esta solicitud no es de compra."}, status=status.HTTP_400_BAD_REQUEST
            )
        if solicitud.orden_compra_id:
            return Response(
                {"detail": "Esta solicitud ya tiene una orden de compra."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        empresa = self._empresa()
        almacen_destino = Almacen.objects.filter(
            pk=request.data.get("almacen_destino"), empresa=empresa
        ).first()
        if not almacen_destino:
            return Response(
                {"detail": "Indica un almacén de destino válido."}, status=status.HTTP_400_BAD_REQUEST
            )

        proveedor_registrado = Proveedor.objects.filter(
            pk=request.data.get("proveedor_registrado"), empresa=empresa
        ).first()

        orden = OrdenCompra.objects.create(
            material=solicitud.material,
            orden_trabajo=solicitud.orden_trabajo,
            tipo="EMERGENCIA" if solicitud.fuente == "COMPRA_EMERGENCIA" else "NORMAL",
            cantidad=solicitud.cantidad,
            proveedor=request.data.get("proveedor", "")
            or (proveedor_registrado.nombre if proveedor_registrado else ""),
            proveedor_registrado=proveedor_registrado,
            costo_estimado=solicitud.costo_estimado,
            tiempo_entrega_dias=request.data.get("tiempo_entrega_dias")
            or (proveedor_registrado.lead_time_dias if proveedor_registrado else 0),
            almacen_destino=almacen_destino,
        )
        solicitud.orden_compra = orden
        solicitud.estado = "EN_PROCESO"
        solicitud.save(update_fields=["orden_compra", "estado"])
        return Response(SolicitudMaterialSerializer(solicitud).data, status=status.HTTP_201_CREATED)
