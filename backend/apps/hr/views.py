from rest_framework import viewsets
from apps.accounts.permissions import (
    SoloAdministracionEscribe,
    SoloAdministracionEscribeAdminElimina,
    SoloSuperusuarioEscribe,
)
from apps.companies.csv_mixins import CsvImportExportMixin, parse_bool_csv
from apps.companies.mixins import EmpresaScopedMixin
from .models import Ausencia, Especialidad, Habilidad, Tecnico
from .serializers import (
    AusenciaSerializer,
    EspecialidadSerializer,
    HabilidadSerializer,
    TecnicoSerializer,
)


class EspecialidadViewSet(viewsets.ModelViewSet):
    queryset = Especialidad.objects.all()
    serializer_class = EspecialidadSerializer
    permission_classes = [SoloSuperusuarioEscribe]


class HabilidadViewSet(viewsets.ModelViewSet):
    queryset = Habilidad.objects.all()
    serializer_class = HabilidadSerializer
    permission_classes = [SoloSuperusuarioEscribe]


class TecnicoViewSet(CsvImportExportMixin, EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = Tecnico.objects.all().select_related("especialidad").prefetch_related("habilidades")
    serializer_class = TecnicoSerializer
    permission_classes = [SoloAdministracionEscribeAdminElimina]
    filterset_fields = ["especialidad", "disponible", "activo"]
    search_fields = ["codigo", "nombre"]

    campos_csv = [
        "codigo",
        "nombre",
        "especialidad_nombre",
        "habilidades_nombres",
        "tarifa_hora",
        "productividad_pct",
        "capacidad_diaria_horas",
        "disponible",
        "activo",
    ]
    def _valor_export(self, obj, campo):
        if campo == "especialidad_nombre":
            return obj.especialidad.nombre
        if campo == "habilidades_nombres":
            return ";".join(obj.habilidades.values_list("nombre", flat=True))
        return super()._valor_export(obj, campo)

    def _preparar_fila_csv(self, fila):
        if not fila["especialidad_nombre"]:
            raise ValueError("Falta la especialidad.")
        especialidad, _ = Especialidad.objects.get_or_create(nombre=fila["especialidad_nombre"])

        habilidades_ids = []
        for nombre in fila["habilidades_nombres"].split(";"):
            nombre = nombre.strip()
            if nombre:
                habilidad, _ = Habilidad.objects.get_or_create(nombre=nombre)
                habilidades_ids.append(habilidad.id)

        return {
            "codigo": fila["codigo"],
            "nombre": fila["nombre"],
            "especialidad": especialidad.id,
            "habilidades": habilidades_ids,
            "tarifa_hora": fila["tarifa_hora"] or 0,
            "productividad_pct": fila["productividad_pct"] or 100,
            "capacidad_diaria_horas": fila["capacidad_diaria_horas"] or 8,
            "disponible": parse_bool_csv(fila["disponible"], True),
            "activo": parse_bool_csv(fila["activo"], True),
        }


class AusenciaViewSet(EmpresaScopedMixin, viewsets.ModelViewSet):
    queryset = Ausencia.objects.all().select_related("tecnico")
    serializer_class = AusenciaSerializer
    permission_classes = [SoloAdministracionEscribe]
    filterset_fields = ["tecnico", "tipo"]
    empresa_lookup = "tecnico__empresa"
    parent_field = "tecnico"
