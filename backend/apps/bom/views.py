from rest_framework import viewsets
from apps.accounts.permissions import SoloAdministracionEscribe
from apps.assets.models import Activo
from apps.companies.csv_mixins import CsvImportExportMixin
from apps.companies.mixins import EmpresaScopedMixin
from apps.inventory.models import Material
from .models import EquipoMaterial
from .serializers import EquipoMaterialSerializer


class EquipoMaterialViewSet(CsvImportExportMixin, EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = EquipoMaterial.objects.all().select_related("activo", "material")
    serializer_class = EquipoMaterialSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["activo", "material"]
    empresa_lookup = "activo__empresa"
    parent_field = "activo"

    campos_csv = ["activo_codigo", "material_codigo", "cantidad_referencia", "notas"]

    def _valor_export(self, obj, campo):
        if campo == "activo_codigo":
            return obj.activo.codigo
        if campo == "material_codigo":
            return obj.material.codigo
        return super()._valor_export(obj, campo)

    def _preparar_fila_csv(self, fila):
        empresa = self._empresa()
        activo = Activo.objects.filter(empresa=empresa, codigo=fila["activo_codigo"]).first()
        if activo is None:
            raise ValueError(f"No existe el activo «{fila['activo_codigo']}».")
        material = Material.objects.filter(empresa=empresa, codigo=fila["material_codigo"]).first()
        if material is None:
            raise ValueError(f"No existe el material «{fila['material_codigo']}».")

        return {
            "activo": activo.id,
            "material": material.id,
            "cantidad_referencia": fila["cantidad_referencia"] or 1,
            "notas": fila["notas"],
        }
