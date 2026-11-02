from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import SoloAdministracionEscribe
from apps.companies.mixins import EmpresaScopedMixin
from apps.workorders.serializers import OrdenTrabajoListSerializer
from .models import PlanPreventivo
from .serializers import PlanPreventivoSerializer
from .services import generar_ordenes_pendientes


class PlanPreventivoViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = PlanPreventivo.objects.all().select_related("activo")
    serializer_class = PlanPreventivoSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["activo", "tipo", "activo_flag"]
    empresa_lookup = "activo__empresa"
    parent_field = "activo"

    @action(detail=False, methods=["post"], url_path="generar-ordenes")
    def generar_ordenes(self, request):
        usuario = request.data.get("usuario", request.user.username)
        empresa = getattr(request.user, "perfil", None) and request.user.perfil.empresa
        ordenes = generar_ordenes_pendientes(empresa=empresa, usuario=usuario)
        return Response(
            {
                "generadas": len(ordenes),
                "ordenes": OrdenTrabajoListSerializer(ordenes, many=True).data,
            }
        )
