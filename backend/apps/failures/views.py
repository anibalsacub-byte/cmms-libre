import csv
import io

from django.http import StreamingHttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import SoloSuperusuarioEscribe
from .models import Sintoma, ModoFalla, MecanismoFalla, CausaFalla
from .serializers import (
    SintomaSerializer,
    ModoFallaSerializer,
    MecanismoFallaSerializer,
    CausaFallaSerializer,
)


class CsvImportExportMixin:
    """Exportar/importar el catálogo como CSV (P1-6): mismas columnas que
    `campos_csv`, en el orden declarado. Pensado para catálogos globales
    chicos (ISO 14224), no para datos transaccionales."""

    campos_csv: list[str] = []

    @action(detail=False, methods=["get"], url_path="exportar-csv")
    def exportar_csv(self, request):
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(self.campos_csv)
        for obj in self.filter_queryset(self.get_queryset()):
            writer.writerow([getattr(obj, campo) for campo in self.campos_csv])

        nombre = self.get_queryset().model._meta.verbose_name_plural.lower().replace(" ", "_")
        response = StreamingHttpResponse(
            [buffer.getvalue()], content_type="text/csv; charset=utf-8"
        )
        response["Content-Disposition"] = f"attachment; filename={nombre}.csv"
        return response

    @action(detail=False, methods=["post"], url_path="importar-csv")
    def importar_csv(self, request):
        archivo = request.FILES.get("archivo")
        if not archivo:
            return Response(
                {"detail": "Falta el archivo CSV (campo 'archivo')."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            texto = archivo.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            return Response(
                {"detail": "El archivo no es un CSV de texto válido (UTF-8)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lector = csv.DictReader(io.StringIO(texto))
        creados = 0
        errores = []
        for i, fila in enumerate(lector, start=2):
            datos = {campo: (fila.get(campo) or "").strip() for campo in self.campos_csv}
            serializer = self.get_serializer(data=datos)
            if serializer.is_valid():
                serializer.save()
                creados += 1
            else:
                errores.append({"fila": i, "errores": serializer.errors})

        return Response({"creados": creados, "errores": errores})


class SintomaViewSet(CsvImportExportMixin, viewsets.ModelViewSet):
    queryset = Sintoma.objects.all()
    serializer_class = SintomaSerializer
    permission_classes = [SoloSuperusuarioEscribe]
    campos_csv = ["nombre"]


class ModoFallaViewSet(CsvImportExportMixin, viewsets.ModelViewSet):
    queryset = ModoFalla.objects.all()
    serializer_class = ModoFallaSerializer
    permission_classes = [SoloSuperusuarioEscribe]
    campos_csv = ["codigo", "nombre"]


class MecanismoFallaViewSet(CsvImportExportMixin, viewsets.ModelViewSet):
    queryset = MecanismoFalla.objects.all()
    serializer_class = MecanismoFallaSerializer
    permission_classes = [SoloSuperusuarioEscribe]
    campos_csv = ["codigo", "nombre"]


class CausaFallaViewSet(CsvImportExportMixin, viewsets.ModelViewSet):
    queryset = CausaFalla.objects.all()
    serializer_class = CausaFallaSerializer
    permission_classes = [SoloSuperusuarioEscribe]
    filterset_fields = ["categoria"]
    campos_csv = ["codigo", "nombre", "categoria"]
