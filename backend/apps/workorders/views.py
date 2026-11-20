import csv
from datetime import datetime, timedelta

from django.db.models import Sum
from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.accounts.permissions import TecnicoEscribeAdministracionGestiona
from apps.assets.models import Activo
from apps.companies.csv_mixins import CsvImportExportMixin
from apps.companies.mixins import EmpresaScopedMixin
from apps.hr.models import Tecnico
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


CAMPOS_CLASIFICACION_FALLA = ("sintoma", "modo_falla", "mecanismo_falla", "causa_falla")


def _aplicar_clasificacion_falla(orden, datos):
    for campo in CAMPOS_CLASIFICACION_FALLA:
        if campo in datos:
            setattr(orden, f"{campo}_id", datos.get(campo) or None)


def _falta_clasificacion_falla(orden):
    """P1-7: el cierre de un correctivo exige modo/mecanismo/causa de falla,
    salvo que la empresa lo haya hecho opcional en Configuración."""
    empresa = orden.empresa
    exige = empresa.exige_clasificacion_falla_en_cierre if empresa else True
    if orden.tipo != "CORRECTIVO" or not exige:
        return False
    obligatorios = ("modo_falla", "mecanismo_falla", "causa_falla")
    return any(getattr(orden, f"{campo}_id") is None for campo in obligatorios)


class OrdenTrabajoViewSet(CsvImportExportMixin, EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = OrdenTrabajo.objects.all().select_related("activo", "tecnico_principal", "aviso")
    permission_classes = [TecnicoEscribeAdministracionGestiona]
    filterset_fields = ["estado", "tipo", "prioridad", "activo", "tecnico_principal"]
    search_fields = ["numero", "descripcion"]

    campos_csv = [
        "activo_codigo",
        "tipo",
        "prioridad",
        "descripcion",
        "estado",
        "fecha_creacion",
        "fecha_planificada",
        "fecha_fin",
        "trabajo_realizado",
        "tiempo_parada_horas",
    ]
    def _valor_export(self, obj, campo):
        if campo == "activo_codigo":
            return obj.activo.codigo
        if campo == "fecha_creacion":
            return obj.fecha_creacion.date().isoformat()
        return super()._valor_export(obj, campo)

    def _preparar_fila_csv(self, fila):
        empresa = self._empresa()
        activo = Activo.objects.filter(empresa=empresa, codigo=fila["activo_codigo"]).first()
        if activo is None:
            raise ValueError(f"No existe el activo «{fila['activo_codigo']}».")
        if fila["tipo"] not in dict(OrdenTrabajo.TIPO_CHOICES):
            raise ValueError(
                f"Tipo «{fila['tipo']}» inválido (usa CORRECTIVO, PREVENTIVO, PREDICTIVO o MEJORA)."
            )
        if fila["estado"] and fila["estado"] not in dict(OrdenTrabajo.ESTADO_CHOICES):
            raise ValueError(f"Estado «{fila['estado']}» inválido.")

        return {
            "activo": activo.id,
            "tipo": fila["tipo"],
            "prioridad": fila["prioridad"] or "MEDIA",
            "descripcion": fila["descripcion"] or "Importada desde CSV",
            "estado": fila["estado"] or "CERRADA",
            "fecha_planificada": fila["fecha_planificada"] or None,
            "fecha_fin": fila["fecha_fin"] or None,
            "trabajo_realizado": fila["trabajo_realizado"],
            "tiempo_parada_horas": fila["tiempo_parada_horas"] or 0,
        }

    def _despues_de_crear_csv(self, instancia, fila):
        if fila.get("fecha_creacion"):
            OrdenTrabajo.objects.filter(pk=instancia.pk).update(
                fecha_creacion=fila["fecha_creacion"]
            )
        BitacoraOT.objects.create(
            orden_trabajo=instancia, evento="OT histórica importada desde CSV"
        )

    def get_serializer_class(self):
        if self.action == "list":
            return OrdenTrabajoListSerializer
        return OrdenTrabajoSerializer

    def perform_create(self, serializer):
        orden = serializer.save(empresa=self._empresa())
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

        if nuevo_estado == "CERRADA":
            _aplicar_clasificacion_falla(orden, request.data)
            if _falta_clasificacion_falla(orden):
                return Response(
                    {
                        "detail": (
                            "Para cerrar una OT correctiva debes indicar modo, mecanismo y "
                            "causa de falla (ISO 14224)."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

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
        _aplicar_clasificacion_falla(orden, request.data)
        if _falta_clasificacion_falla(orden):
            return Response(
                {
                    "detail": (
                        "Para cerrar una OT correctiva debes indicar modo, mecanismo y "
                        "causa de falla (ISO 14224)."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        orden.estado = "CERRADA"
        orden.fecha_fin = timezone.now()
        orden.trabajo_realizado = request.data.get(
            "trabajo_realizado", orden.trabajo_realizado
        )
        if "tiempo_parada_horas" in request.data:
            orden.tiempo_parada_horas = request.data.get("tiempo_parada_horas") or 0
        orden.save()
        BitacoraOT.objects.create(
            orden_trabajo=orden,
            usuario=request.data.get("usuario", ""),
            evento="OT cerrada",
            detalle=request.data.get("comentario", ""),
        )
        return Response(OrdenTrabajoSerializer(orden).data)


    @action(detail=False, methods=["get"], url_path="exportar-csv")
    def exportar_csv(self, request):
        import io

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(
            [
                "numero",
                "activo",
                "tipo",
                "prioridad",
                "estado",
                "fecha_creacion",
                "fecha_planificada",
                "fecha_fin",
                "tiempo_parada_horas",
                "costo_mano_obra",
                "costo_materiales",
                "costo_total",
            ]
        )
        for o in self.filter_queryset(self.get_queryset()):
            writer.writerow(
                [
                    o.numero,
                    o.activo.codigo,
                    o.tipo,
                    o.prioridad,
                    o.estado,
                    o.fecha_creacion.date().isoformat(),
                    o.fecha_planificada or "",
                    o.fecha_fin.date().isoformat() if o.fecha_fin else "",
                    o.tiempo_parada_horas,
                    o.costo_mano_obra,
                    o.costo_materiales,
                    o.costo_total,
                ]
            )

        response = StreamingHttpResponse(
            [buffer.getvalue()], content_type="text/csv; charset=utf-8"
        )
        response["Content-Disposition"] = "attachment; filename=ordenes_trabajo.csv"
        return response


class TareaOTViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = TareaOT.objects.all()
    serializer_class = TareaOTSerializer
    permission_classes = [TecnicoEscribeAdministracionGestiona]
    filterset_fields = ["orden_trabajo", "completada"]
    empresa_lookup = "orden_trabajo__empresa"
    parent_field = "orden_trabajo"


class AsignacionTecnicoViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    """Las horas de técnico, igual que los materiales, se pueden agregar y
    quitar libremente mientras la OT siga abierta."""

    queryset = AsignacionTecnico.objects.all().select_related("tecnico")
    serializer_class = AsignacionTecnicoSerializer
    permission_classes = [TecnicoEscribeAdministracionGestiona]
    filterset_fields = ["orden_trabajo", "tecnico", "fecha"]
    empresa_lookup = "orden_trabajo__empresa"
    parent_field = "orden_trabajo"

    def _verificar_ot_abierta(self, orden_trabajo):
        if orden_trabajo.estado in ("CERRADA", "CANCELADA"):
            raise PermissionDenied("La OT ya está cerrada; no se pueden modificar sus horas registradas.")

    def perform_create(self, serializer):
        orden = serializer.validated_data.get("orden_trabajo")
        if orden is not None:
            self._verificar_ot_abierta(orden)
        super().perform_create(serializer)

    def perform_update(self, serializer):
        self._verificar_ot_abierta(serializer.instance.orden_trabajo)
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        self._verificar_ot_abierta(instance.orden_trabajo)
        instance.delete()


class MaterialUtilizadoViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    """Los materiales se pueden agregar y quitar libremente (como los
    componentes de una orden SAP) mientras la OT siga abierta; una vez
    cerrada o cancelada, quedan fijos para no alterar el costo histórico."""

    queryset = MaterialUtilizado.objects.all().select_related("material")
    serializer_class = MaterialUtilizadoSerializer
    permission_classes = [TecnicoEscribeAdministracionGestiona]
    filterset_fields = ["orden_trabajo", "material", "fuente"]
    empresa_lookup = "orden_trabajo__empresa"
    parent_field = "orden_trabajo"

    def _verificar_ot_abierta(self, orden_trabajo):
        if orden_trabajo.estado in ("CERRADA", "CANCELADA"):
            raise PermissionDenied("La OT ya está cerrada; no se pueden modificar sus materiales.")

    def perform_create(self, serializer):
        orden = serializer.validated_data.get("orden_trabajo")
        if orden is not None:
            self._verificar_ot_abierta(orden)
        super().perform_create(serializer)

    def perform_destroy(self, instance):
        self._verificar_ot_abierta(instance.orden_trabajo)
        instance.delete()


class IntentoReparacionViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = IntentoReparacion.objects.all()
    serializer_class = IntentoReparacionSerializer
    permission_classes = [TecnicoEscribeAdministracionGestiona]
    filterset_fields = ["orden_trabajo"]
    empresa_lookup = "orden_trabajo__empresa"
    parent_field = "orden_trabajo"


class BitacoraOTViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = BitacoraOT.objects.all()
    serializer_class = BitacoraOTSerializer
    permission_classes = [TecnicoEscribeAdministracionGestiona]
    filterset_fields = ["orden_trabajo"]
    empresa_lookup = "orden_trabajo__empresa"
    parent_field = "orden_trabajo"


class PlanificacionSemanaView(APIView):
    """P1-2/P1-3: calendario semanal de carga por técnico — asignaciones por
    día, sobrecarga (horas planificadas > capacidad del día, o ausencia) y
    el backlog expresado en semanas de capacidad del equipo."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa = getattr(request.user.perfil, "empresa", None) if hasattr(request.user, "perfil") else None

        fecha_str = request.query_params.get("fecha_inicio")
        if fecha_str:
            try:
                fecha_inicio = datetime.strptime(fecha_str, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"detail": "fecha_inicio debe tener formato AAAA-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            hoy = timezone.now().date()
            fecha_inicio = hoy - timedelta(days=hoy.weekday())

        dias = [fecha_inicio + timedelta(days=i) for i in range(7)]

        tecnicos_qs = Tecnico.objects.filter(empresa=empresa, activo=True).order_by("codigo")
        asignaciones = (
            AsignacionTecnico.objects.filter(
                tecnico__in=tecnicos_qs, fecha__gte=dias[0], fecha__lte=dias[-1]
            )
            .select_related("orden_trabajo", "orden_trabajo__activo")
            .order_by("fecha")
        )

        asignaciones_por_tecnico = {}
        for a in asignaciones:
            asignaciones_por_tecnico.setdefault(a.tecnico_id, []).append(a)

        tecnicos_payload = []
        for tecnico in tecnicos_qs:
            dias_payload = {}
            for fecha in dias:
                asignaciones_dia = [
                    a for a in asignaciones_por_tecnico.get(tecnico.id, []) if a.fecha == fecha
                ]
                ausente = tecnico.tiene_ausencia(fecha)
                horas_planificadas = sum(float(a.horas_planificadas) for a in asignaciones_dia)
                dias_payload[fecha.isoformat()] = {
                    "ausente": ausente,
                    "horas_planificadas": round(horas_planificadas, 2),
                    "horas_disponibles": (
                        0.0 if ausente else round(float(tecnico.capacidad_diaria_horas) - horas_planificadas, 2)
                    ),
                    "sobrecarga": (not ausente) and horas_planificadas > float(tecnico.capacidad_diaria_horas),
                    "asignaciones": [
                        {
                            "id": a.id,
                            "orden_trabajo": a.orden_trabajo_id,
                            "orden_trabajo_numero": a.orden_trabajo.numero,
                            "activo_codigo": a.orden_trabajo.activo.codigo,
                            "descripcion": a.orden_trabajo.descripcion,
                            "horas_planificadas": float(a.horas_planificadas),
                            "horas_reales": float(a.horas_reales) if a.horas_reales is not None else None,
                        }
                        for a in asignaciones_dia
                    ],
                }
            tecnicos_payload.append(
                {
                    "id": tecnico.id,
                    "codigo": tecnico.codigo,
                    "nombre": tecnico.nombre,
                    "capacidad_diaria_horas": float(tecnico.capacidad_diaria_horas),
                    "dias": dias_payload,
                }
            )

        # Backlog en semanas de capacidad: horas planificadas pendientes de
        # ejecutar (sin horas reales) de OT aún abiertas ÷ capacidad semanal
        # del equipo (5 días hábiles por técnico activo y disponible).
        horas_pendientes = float(
            AsignacionTecnico.objects.filter(
                tecnico__empresa=empresa,
                horas_reales__isnull=True,
            )
            .exclude(orden_trabajo__estado__in=["CERRADA", "CANCELADA"])
            .aggregate(total=Sum("horas_planificadas"))["total"]
            or 0
        )
        capacidad_semanal_total = sum(
            float(t.capacidad_diaria_horas) * 5
            for t in Tecnico.objects.filter(empresa=empresa, activo=True, disponible=True)
        )
        backlog_semanas = (
            round(horas_pendientes / capacidad_semanal_total, 2) if capacidad_semanal_total else None
        )

        return Response(
            {
                "dias": [d.isoformat() for d in dias],
                "tecnicos": tecnicos_payload,
                "horas_pendientes": round(horas_pendientes, 2),
                "capacidad_semanal_total_horas": round(capacidad_semanal_total, 2),
                "backlog_semanas": backlog_semanas,
            }
        )
