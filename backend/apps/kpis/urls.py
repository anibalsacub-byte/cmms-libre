from django.urls import path
from .views import DashboardView, ParetoFallasView

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("pareto/", ParetoFallasView.as_view(), name="pareto-fallas"),
]
