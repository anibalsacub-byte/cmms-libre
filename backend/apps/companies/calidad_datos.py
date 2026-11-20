"""P1-9: informe de calidad de datos de una empresa.

Nota sobre "activos sin ubicación" y "OT sin activo": el modelo ya exige
esos campos (FK obligatoria), así que estructuralmente no pueden faltar;
igual se incluyen en el informe (siempre en 0) para que quede documentado
que se verificó, no que se omitió."""

import re
from collections import defaultdict

from apps.assets.models import Activo, ClaseActivo, UbicacionTecnica
from apps.hr.models import Tecnico
from apps.inventory.models import Material
from apps.workorders.models import OrdenTrabajo


def _duplicados_por_nombre(queryset, campo_nombre="nombre"):
    """Agrupa por nombre normalizado (minúsculas, espacios colapsados) y
    devuelve los grupos con más de un código distinto: señal típica de un
    alta duplicada con otro código."""

    grupos = defaultdict(list)
    for obj in queryset:
        clave = " ".join(getattr(obj, campo_nombre).split()).lower()
        grupos[clave].append(obj.codigo)

    return [
        {"nombre": clave, "codigos": sorted(set(codigos))}
        for clave, codigos in grupos.items()
        if len(set(codigos)) > 1
    ]


def _codigos_formato_invalido(queryset, patron):
    if not patron:
        return []
    try:
        regex = re.compile(patron)
    except re.error:
        return []
    return [obj.codigo for obj in queryset if not regex.match(obj.codigo)]


def informe_calidad_datos(empresa):
    activos = list(Activo.objects.filter(empresa=empresa))
    materiales = list(Material.objects.filter(empresa=empresa))
    tecnicos = list(Tecnico.objects.filter(empresa=empresa))
    clases = list(ClaseActivo.objects.filter(empresa=empresa))
    ubicaciones = list(UbicacionTecnica.objects.filter(empresa=empresa))

    patron = empresa.patron_codigo if empresa else ""

    return {
        "patron_codigo": patron,
        "duplicados_por_nombre": {
            "activos": _duplicados_por_nombre(activos),
            "materiales": _duplicados_por_nombre(materiales, "descripcion"),
        },
        "campos_obligatorios_vacios": {
            "activos_sin_ubicacion": [],  # el modelo lo exige; ver docstring
            "ot_sin_activo": [],  # el modelo lo exige; ver docstring
            "materiales_sin_costo": [
                m.codigo for m in materiales if not m.costo_unitario
            ],
            "activos_sin_ficha_tecnica": [
                a.codigo
                for a in activos
                if not (a.fabricante or a.modelo or a.numero_serie)
            ],
            "tecnicos_sin_tarifa": [t.codigo for t in tecnicos if not t.tarifa_hora],
        },
        "codigos_formato_invalido": {
            "activos": _codigos_formato_invalido(activos, patron),
            "materiales": _codigos_formato_invalido(materiales, patron),
            "tecnicos": _codigos_formato_invalido(tecnicos, patron),
            "clases_activo": _codigos_formato_invalido(clases, patron),
            "ubicaciones_tecnicas": _codigos_formato_invalido(ubicaciones, patron),
        },
        "totales": {
            "activos": len(activos),
            "materiales": len(materiales),
            "tecnicos": len(tecnicos),
            "ordenes_trabajo": OrdenTrabajo.objects.filter(empresa=empresa).count(),
        },
    }
