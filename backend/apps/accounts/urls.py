from django.urls import path
from .views import (
    MeView,
    CambiarPasswordView,
    CargarDemoView,
    ReiniciarInstalacionView,
    RegistrarEmpresaView,
)

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("cambiar-password/", CambiarPasswordView.as_view(), name="cambiar-password"),
    path("cargar-demo/", CargarDemoView.as_view(), name="cargar-demo"),
    path(
        "reiniciar-instalacion/",
        ReiniciarInstalacionView.as_view(),
        name="reiniciar-instalacion",
    ),
    path("registrar-empresa/", RegistrarEmpresaView.as_view(), name="registrar-empresa"),
]
