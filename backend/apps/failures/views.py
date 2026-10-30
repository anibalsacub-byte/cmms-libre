from rest_framework import viewsets
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


class ModoFallaViewSet(viewsets.ModelViewSet):
    queryset = ModoFalla.objects.all()
    serializer_class = ModoFallaSerializer


class MecanismoFallaViewSet(viewsets.ModelViewSet):
    queryset = MecanismoFalla.objects.all()
    serializer_class = MecanismoFallaSerializer


class CausaFallaViewSet(viewsets.ModelViewSet):
    queryset = CausaFalla.objects.all()
    serializer_class = CausaFallaSerializer
    filterset_fields = ["categoria"]
