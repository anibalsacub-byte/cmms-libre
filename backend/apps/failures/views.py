from rest_framework import viewsets
from apps.accounts.permissions import SoloSuperusuarioEscribe
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
    permission_classes = [SoloSuperusuarioEscribe]


class ModoFallaViewSet(viewsets.ModelViewSet):
    queryset = ModoFalla.objects.all()
    serializer_class = ModoFallaSerializer
    permission_classes = [SoloSuperusuarioEscribe]


class MecanismoFallaViewSet(viewsets.ModelViewSet):
    queryset = MecanismoFalla.objects.all()
    serializer_class = MecanismoFallaSerializer
    permission_classes = [SoloSuperusuarioEscribe]


class CausaFallaViewSet(viewsets.ModelViewSet):
    queryset = CausaFalla.objects.all()
    serializer_class = CausaFallaSerializer
    permission_classes = [SoloSuperusuarioEscribe]
    filterset_fields = ["categoria"]
