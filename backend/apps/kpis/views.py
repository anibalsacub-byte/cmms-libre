from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .services import kpis_mantenimiento, kpis_oee


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        dias = int(request.query_params.get("dias", 30))
        activo_id = request.query_params.get("activo")
        linea_id = request.query_params.get("linea")

        return Response(
            {
                "mantenimiento": kpis_mantenimiento(dias=dias, activo_id=activo_id),
                "oee": kpis_oee(dias=dias, linea_id=linea_id),
            }
        )
