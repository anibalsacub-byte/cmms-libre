from rest_framework import viewsets
from apps.accounts.permissions import SoloAdministracionEscribe
from .models import Sintoma, ModoFalla, MecanismoFalla, CausaFalla
from .serializers import (
    SintomaSerializer,
    ModoFallaSerializer,
    MecanismoFallaSerializer,
    CausaFallaSerializer,
)


class SintomaViewSet(viewsets.ModelViewSet):
    queryset = Sintoma.objects.all()
    serializer_class = SintomaSerializer
    permission_classes = [SoloAdministracionEscribe]


class ModoFallaViewSet(viewsets.ModelViewSet):
    queryset = ModoFalla.objects.all()
    serializer_class = ModoFallaSerializer
    permission_classes = [SoloAdministracionEscribe]


class MecanismoFallaViewSet(viewsets.ModelViewSet):
    queryset = MecanismoFalla.objects.all()
    serializer_class = MecanismoFallaSerializer
    permission_classes = [SoloAdministracionEscribe]


class CausaFallaViewSet(viewsets.ModelViewSet):
    queryset = CausaFalla.objects.all()
    serializer_class = CausaFallaSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["categoria"]
