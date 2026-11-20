from django.urls import path
from .views import DashboardView, ParetoFallasView, ReporteCostosView

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("pareto/", ParetoFallasView.as_view(), name="pareto-fallas"),
    path("reporte-costos/", ReporteCostosView.as_view(), name="reporte-costos"),
]
