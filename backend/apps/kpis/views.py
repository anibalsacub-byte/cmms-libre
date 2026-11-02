from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .services import kpis_mantenimiento, kpis_oee, pareto_fallas


def _empresa(request):
    perfil = getattr(request.user, "perfil", None)
    return perfil.empresa if perfil else None


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        dias = int(request.query_params.get("dias", 30))
        activo_id = request.query_params.get("activo")
        linea_id = request.query_params.get("linea")
        empresa = _empresa(request)

        return Response(
            {
                "mantenimiento": kpis_mantenimiento(empresa, dias=dias, activo_id=activo_id),
                "oee": kpis_oee(empresa, dias=dias, linea_id=linea_id),
            }
        )


class ParetoFallasView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        dias = int(request.query_params.get("dias", 90))
        activo_id = request.query_params.get("activo")
        return Response(pareto_fallas(_empresa(request), dias=dias, activo_id=activo_id))
