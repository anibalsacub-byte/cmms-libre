"""Importar/exportar listas como CSV (P2-4/P2-5): una plantilla descargable
por entidad, exportar lo que ya existe, e importar con vista previa de
errores por fila (las filas válidas se crean; las inválidas se reportan,
nunca se aborta el lote completo por una sola fila mala)."""

import csv
import io

from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response


def parse_bool_csv(valor, default):
    """Interpreta un valor de columna CSV (Sí/No, true/false, 1/0, x) como
    booleano; vacío usa `default`."""
    if valor is None or valor == "":
        return default
    return valor.strip().lower() in ("1", "true", "si", "sí", "yes", "x")


class CsvImportExportMixin:
    """Se combina con un ViewSet (idealmente ya EmpresaScopedMixin, para que
    `perform_create` estampe la empresa sola). Cada ViewSet declara:

    - `campos_csv`: columnas de la plantilla/importación, en orden.
    - `columnas_export` (opcional): columnas del export, si difieren de las
      de importación (ej. export usa IDs de catálogos y plantilla usa
      códigos legibles).
    - `_preparar_fila_csv(self, fila: dict) -> dict`: convierte una fila cruda
      del CSV (columnas = `campos_csv`) en los datos que espera el
      serializer (resolviendo columnas "_codigo"/"_nombre" a IDs). Lanza
      `ValueError` con un mensaje claro si algo no se puede resolver.
    """

    campos_csv: list[str] = []
    columnas_export: list[str] | None = None

    def _nombre_archivo(self, prefijo):
        nombre = self.get_queryset().model._meta.verbose_name_plural.lower().replace(" ", "_")
        return f"{prefijo}_{nombre}.csv"

    @action(detail=False, methods=["get"], url_path="plantilla-csv")
    def plantilla_csv(self, request):
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(self.campos_csv)
        response = StreamingHttpResponse(
            [buffer.getvalue()], content_type="text/csv; charset=utf-8"
        )
        response["Content-Disposition"] = f"attachment; filename={self._nombre_archivo('plantilla')}"
        return response

    def _valor_export(self, obj, campo):
        valor = getattr(obj, campo, "")
        return "" if valor is None else valor

    @action(detail=False, methods=["get"], url_path="exportar-csv")
    def exportar_csv(self, request):
        columnas = self.columnas_export or self.campos_csv
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(columnas)
        for obj in self.filter_queryset(self.get_queryset()):
            writer.writerow([self._valor_export(obj, campo) for campo in columnas])
        response = StreamingHttpResponse(
            [buffer.getvalue()], content_type="text/csv; charset=utf-8"
        )
        response["Content-Disposition"] = f"attachment; filename={self._nombre_archivo('export')}"
        return response

    def _preparar_fila_csv(self, fila):
        return dict(fila)

    def _despues_de_crear_csv(self, instancia, fila):
        """Hook opcional: algo más que hacer tras crear la fila (ej. forzar
        una fecha histórica en un campo `auto_now_add`, que `create()` ignora)."""

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
        for i, fila_cruda in enumerate(lector, start=2):
            fila = {campo: (fila_cruda.get(campo) or "").strip() for campo in self.campos_csv}
            try:
                datos = self._preparar_fila_csv(fila)
            except ValueError as exc:
                errores.append({"fila": i, "errores": {"__all__": [str(exc)]}})
                continue

            serializer = self.get_serializer(data=datos)
            if serializer.is_valid():
                self.perform_create(serializer)
                self._despues_de_crear_csv(serializer.instance, fila)
                creados += 1
            else:
                errores.append({"fila": i, "errores": serializer.errors})

        return Response({"creados": creados, "errores": errores})
