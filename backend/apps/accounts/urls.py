from django.urls import path
from .views import MeView, CambiarPasswordView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("cambiar-password/", CambiarPasswordView.as_view(), name="cambiar-password"),
]
