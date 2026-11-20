import csv
import io

from django.http import StreamingHttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.views import SoloAdminDeEmpresa
from .calidad_datos import informe_calidad_datos
from .mixins import EmpresaScopedMixin
from .models import RegistroAuditoria
from .serializers import RegistroAuditoriaSerializer


class CalidadDatosView(APIView):
    """P1-9: informe de calidad de datos de la empresa del usuario."""

    permission_classes = [SoloAdminDeEmpresa]

    def get(self, request):
        return Response(informe_calidad_datos(request.user.perfil.empresa))


class RegistroAuditoriaViewSet(EmpresaScopedMixin, viewsets.ReadOnlyModelViewSet):
    """P2-6: bitácora de auditoría global, consultable y exportable. Solo
    lectura (los registros los crea el sistema, nunca un usuario) y solo
    para el Administrador de la empresa."""

    queryset = RegistroAuditoria.objects.all()
    serializer_class = RegistroAuditoriaSerializer
    permission_classes = [SoloAdminDeEmpresa]
    filterset_fields = ["accion", "modelo"]
    search_fields = ["usuario", "objeto_str"]

    @action(detail=False, methods=["get"], url_path="exportar-csv")
    def exportar_csv(self, request):
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["fecha", "usuario", "accion", "modelo", "objeto_id", "objeto_str"])
        for r in self.filter_queryset(self.get_queryset()):
            writer.writerow([r.fecha.isoformat(), r.usuario, r.accion, r.modelo, r.objeto_id, r.objeto_str])
        response = StreamingHttpResponse(
            [buffer.getvalue()], content_type="text/csv; charset=utf-8"
        )
        response["Content-Disposition"] = "attachment; filename=auditoria.csv"
        return response
