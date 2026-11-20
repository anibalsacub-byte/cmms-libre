from rest_framework import viewsets
from apps.accounts.permissions import SoloAdministracionEscribe, SoloAdministracionEscribeAdminElimina
from apps.companies.csv_mixins import CsvImportExportMixin
from apps.companies.mixins import EmpresaScopedMixin
from .models import UbicacionTecnica, ClaseActivo, Activo
from .serializers import UbicacionTecnicaSerializer, ClaseActivoSerializer, ActivoSerializer


class UbicacionTecnicaViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = UbicacionTecnica.objects.all()
    serializer_class = UbicacionTecnicaSerializer
    permission_classes = [SoloAdministracionEscribeAdminElimina]
    filterset_fields = ["padre"]
    search_fields = ["codigo", "nombre"]


class ClaseActivoViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = ClaseActivo.objects.all()
    serializer_class = ClaseActivoSerializer
    permission_classes = [SoloAdministracionEscribe]
    search_fields = ["codigo", "nombre"]


class ActivoViewSet(CsvImportExportMixin, EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = Activo.objects.all().select_related("clase", "ubicacion_tecnica")
    serializer_class = ActivoSerializer
    permission_classes = [SoloAdministracionEscribeAdminElimina]
    filterset_fields = ["clase", "ubicacion_tecnica", "criticidad", "estado"]
    search_fields = ["codigo", "nombre", "numero_serie"]

    campos_csv = [
        "codigo",
        "nombre",
        "clase_codigo",
        "ubicacion_codigo",
        "sistema",
        "criticidad",
        "estado",
        "fabricante",
        "modelo",
        "numero_serie",
        "horas_operacion_acumuladas",
    ]
    def _valor_export(self, obj, campo):
        if campo == "clase_codigo":
            return obj.clase.codigo
        if campo == "ubicacion_codigo":
            return obj.ubicacion_tecnica.codigo
        return super()._valor_export(obj, campo)

    def _preparar_fila_csv(self, fila):
        empresa = self._empresa()
        clase = ClaseActivo.objects.filter(empresa=empresa, codigo=fila["clase_codigo"]).first()
        if clase is None:
            raise ValueError(f"No existe la clase de activo «{fila['clase_codigo']}».")
        ubicacion = UbicacionTecnica.objects.filter(
            empresa=empresa, codigo=fila["ubicacion_codigo"]
        ).first()
        if ubicacion is None:
            raise ValueError(f"No existe la ubicación técnica «{fila['ubicacion_codigo']}».")

        return {
            "codigo": fila["codigo"],
            "nombre": fila["nombre"],
            "clase": clase.id,
            "ubicacion_tecnica": ubicacion.id,
            "sistema": fila["sistema"],
            "criticidad": fila["criticidad"] or "MEDIA",
            "estado": fila["estado"] or "OPERATIVO",
            "fabricante": fila["fabricante"],
            "modelo": fila["modelo"],
            "numero_serie": fila["numero_serie"],
            "horas_operacion_acumuladas": fila["horas_operacion_acumuladas"] or 0,
        }
