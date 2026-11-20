from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .services import kpis_mantenimiento, kpis_oee, pareto_fallas, reporte_costos


def _empresa(request):
    perfil = getattr(request.user, "perfil", None)
    return perfil.empresa if perfil else None


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        dias = int(request.query_params.get("dias", 30))
        activo_id = request.query_params.get("activo")
        clase_id = request.query_params.get("clase")
        ubicacion_id = request.query_params.get("ubicacion")
        linea_id = request.query_params.get("linea")
        empresa = _empresa(request)

        return Response(
            {
                "mantenimiento": kpis_mantenimiento(
                    empresa,
                    dias=dias,
                    activo_id=activo_id,
                    clase_id=clase_id,
                    ubicacion_id=ubicacion_id,
                ),
                "oee": kpis_oee(empresa, dias=dias, linea_id=linea_id),
            }
        )


class ParetoFallasView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        dias = int(request.query_params.get("dias", 90))
        activo_id = request.query_params.get("activo")
        return Response(pareto_fallas(_empresa(request), dias=dias, activo_id=activo_id))


class ReporteCostosView(APIView):
    """P2-5: reporte de costos por activo/ubicación/período, en JSON (para
    la pantalla) o PDF (`?formato=pdf`, para imprimir/compartir)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        dias = int(request.query_params.get("dias", 90))
        activo_id = request.query_params.get("activo")
        clase_id = request.query_params.get("clase")
        ubicacion_id = request.query_params.get("ubicacion")
        empresa = _empresa(request)

        datos = reporte_costos(
            empresa, dias=dias, activo_id=activo_id, clase_id=clase_id, ubicacion_id=ubicacion_id
        )

        if request.query_params.get("formato") == "pdf":
            from .reportes_pdf import pdf_reporte_costos

            pdf = pdf_reporte_costos(empresa, datos)
            response = HttpResponse(pdf, content_type="application/pdf")
            response["Content-Disposition"] = "attachment; filename=reporte_costos.pdf"
            return response

        return Response(datos)
