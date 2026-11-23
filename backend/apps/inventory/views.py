from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from apps.accounts.permissions import (
    SoloAdministracionEscribe,
    SoloAdministracionEscribeAdminElimina,
    SoloSuperusuarioEscribe,
)
from apps.companies.auditoria_mixins import AuditoriaMixin
from apps.companies.csv_mixins import CsvImportExportMixin
from apps.companies.mixins import EmpresaScopedMixin
from .models import Almacen, GrupoMaterial, Material, StockAlmacen, MovimientoStock, TrasladoAlmacen
from .services import ajustar_stock
from .serializers import (
    AlmacenSerializer,
    GrupoMaterialSerializer,
    MaterialSerializer,
    StockAlmacenSerializer,
    MovimientoStockSerializer,
    TrasladoAlmacenSerializer,
)


class AlmacenViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = Almacen.objects.all()
    serializer_class = AlmacenSerializer
    permission_classes = [SoloAdministracionEscribeAdminElimina]
    search_fields = ["codigo", "nombre"]


class GrupoMaterialViewSet(viewsets.ModelViewSet):
    queryset = GrupoMaterial.objects.all()
    serializer_class = GrupoMaterialSerializer
    permission_classes = [SoloSuperusuarioEscribe]


class MaterialViewSet(AuditoriaMixin, CsvImportExportMixin, EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = Material.objects.all().prefetch_related("stocks")
    serializer_class = MaterialSerializer
    permission_classes = [SoloAdministracionEscribeAdminElimina]
    filterset_fields = ["grupo", "estado", "clase"]
    search_fields = ["codigo", "descripcion", "clase"]

    campos_csv = [
        "codigo",
        "descripcion",
        "grupo_nombre",
        "clase",
        "unidad_medida",
        "costo_unitario",
        "estado",
        "tiempo_entrega_dias",
    ]
    def _valor_export(self, obj, campo):
        if campo == "grupo_nombre":
            return obj.grupo.nombre
        return super()._valor_export(obj, campo)

    def _preparar_fila_csv(self, fila):
        nombre_grupo = fila["grupo_nombre"]
        if not nombre_grupo:
            raise ValueError("Falta el grupo de material.")
        grupo, _ = GrupoMaterial.objects.get_or_create(nombre=nombre_grupo)

        return {
            "codigo": fila["codigo"],
            "descripcion": fila["descripcion"],
            "grupo": grupo.id,
            "clase": fila["clase"],
            "unidad_medida": fila["unidad_medida"] or "UN",
            "costo_unitario": fila["costo_unitario"] or 0,
            "estado": fila["estado"] or "ACTIVO",
            "tiempo_entrega_dias": fila["tiempo_entrega_dias"] or 0,
        }


class StockAlmacenViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    """La cantidad nace en 0 y solo se mueve a través de /movimientos/ o de
    recibir un /traslados/, para que siempre quede un historial de por qué
    cambió. Esta vista es para dar de alta el par material-almacén (con su
    stock mínimo/máximo y ubicación), no para editar la cantidad a mano."""

    queryset = StockAlmacen.objects.all().select_related("material", "almacen")
    serializer_class = StockAlmacenSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["almacen", "material"]
    empresa_lookup = "material__empresa"
    parent_field = "material"


class MovimientoStockViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    """Entrada, salida y ajuste de stock. Crear un movimiento recalcula de
    inmediato el StockAlmacen correspondiente; nunca se deja en negativo."""

    queryset = MovimientoStock.objects.all().select_related("material", "almacen")
    serializer_class = MovimientoStockSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["tipo", "almacen", "material"]
    empresa_lookup = "material__empresa"
    parent_field = "material"
    http_method_names = ["get", "post", "head", "options"]

    def perform_create(self, serializer):
        almacen = serializer.validated_data.get("almacen")
        material = serializer.validated_data.get("material")
        if almacen is not None and getattr(almacen, "empresa_id", None) != getattr(
            self._empresa(), "id", None
        ):
            raise PermissionDenied("Ese almacén pertenece a otra empresa.")

        super().perform_create(serializer)
        movimiento = serializer.instance

        if movimiento.tipo == "ENTRADA":
            delta = movimiento.cantidad
        elif movimiento.tipo == "SALIDA":
            delta = -movimiento.cantidad
        else:
            delta = movimiento.cantidad  # AJUSTE: la cantidad ES el delta (puede ser negativo)

        try:
            ajustar_stock(material, almacen, delta)
        except ValidationError:
            movimiento.delete()
            raise


class TrasladoAlmacenViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    """El traslado no mueve stock al crearse (queda "solicitado"); recién se
    descuenta del origen y se suma al destino al marcarlo como recibido."""

    queryset = TrasladoAlmacen.objects.all().select_related(
        "material", "almacen_origen", "almacen_destino"
    )
    serializer_class = TrasladoAlmacenSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["estado"]
    empresa_lookup = "material__empresa"
    parent_field = "material"

    def perform_create(self, serializer):
        empresa_id = getattr(self._empresa(), "id", None)
        origen = serializer.validated_data.get("almacen_origen")
        destino = serializer.validated_data.get("almacen_destino")
        if origen is not None and getattr(origen, "empresa_id", None) != empresa_id:
            raise PermissionDenied("Ese almacén de origen pertenece a otra empresa.")
        if destino is not None and getattr(destino, "empresa_id", None) != empresa_id:
            raise PermissionDenied("Ese almacén de destino pertenece a otra empresa.")
        super().perform_create(serializer)

    @action(detail=True, methods=["post"], url_path="cambiar-estado")
    def cambiar_estado(self, request, pk=None):
        traslado = self.get_object()
        nuevo_estado = request.data.get("estado")
        if nuevo_estado not in dict(TrasladoAlmacen.ESTADO_CHOICES):
            return Response({"detail": "Estado inválido."}, status=status.HTTP_400_BAD_REQUEST)
        if traslado.estado in ("RECIBIDO", "CANCELADO"):
            return Response(
                {"detail": "Este traslado ya se cerró."}, status=status.HTTP_400_BAD_REQUEST
            )

        if nuevo_estado == "RECIBIDO":
            origen, _ = StockAlmacen.objects.get_or_create(
                material=traslado.material, almacen=traslado.almacen_origen
            )
            if origen.cantidad - traslado.cantidad < 0:
                return Response(
                    {"detail": "No hay stock suficiente en el almacén de origen."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            origen.cantidad -= traslado.cantidad
            origen.save(update_fields=["cantidad"])

            destino, _ = StockAlmacen.objects.get_or_create(
                material=traslado.material, almacen=traslado.almacen_destino
            )
            destino.cantidad += traslado.cantidad
            destino.save(update_fields=["cantidad"])

            traslado.fecha_recepcion = timezone.now()

        traslado.estado = nuevo_estado
        traslado.save()
        return Response(TrasladoAlmacenSerializer(traslado).data)
