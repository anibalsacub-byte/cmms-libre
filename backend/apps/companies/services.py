"""Borrado de todos los datos de una empresa (no de otras), respetando el
orden de dependencias (FK con PROTECT) entre modelos. Usado por
'Restablecer instalación' en Configuración: borra los datos, no la cuenta
ni la empresa en sí."""

import json

from django.apps import apps as django_apps
from django.core import serializers as django_serializers
from django.utils import timezone

# Orden de EXPORTACIÓN (padres antes que hijos) de todo lo que pertenece a
# una empresa (P0-8). No incluye: catálogos GLOBALES compartidos entre
# empresas (ISO 14224, especialidades, habilidades: se asume que ya existen
# en el destino), cuentas de usuario (datos sensibles, fuera del alcance de
# este respaldo) ni archivos adjuntos (su contenido vive en el disco del
# servidor, no en la base de datos, y no es portable entre instalaciones).
MODELOS_EMPRESA = [
    ("assets", "UbicacionTecnica", "empresa"),
    ("assets", "ClaseActivo", "empresa"),
    ("assets", "Activo", "empresa"),
    ("assets", "FichaTecnicaCampo", "activo__empresa"),
    ("hr", "Tecnico", "empresa"),
    ("hr", "Ausencia", "tecnico__empresa"),
    ("inventory", "Almacen", "empresa"),
    ("inventory", "Material", "empresa"),
    ("inventory", "StockAlmacen", "material__empresa"),
    ("inventory", "MovimientoStock", "material__empresa"),
    ("inventory", "TrasladoAlmacen", "material__empresa"),
    ("bom", "EquipoMaterial", "activo__empresa"),
    ("notices", "Aviso", "empresa"),
    ("workorders", "OrdenTrabajo", "empresa"),
    ("workorders", "TareaOT", "orden_trabajo__empresa"),
    ("workorders", "AsignacionTecnico", "orden_trabajo__empresa"),
    ("workorders", "MaterialUtilizado", "orden_trabajo__empresa"),
    ("workorders", "IntentoReparacion", "orden_trabajo__empresa"),
    ("workorders", "BitacoraOT", "orden_trabajo__empresa"),
    ("pm_plans", "PlanPreventivo", "activo__empresa"),
    ("purchasing", "Proveedor", "empresa"),
    ("purchasing", "OrdenCompra", "material__empresa"),
    ("purchasing", "SolicitudMaterial", "orden_trabajo__empresa"),
    ("production", "LineaProduccion", "empresa"),
    ("production", "RegistroProduccion", "linea__empresa"),
    ("production", "ImpactoOperativoFalla", "aviso__empresa"),
]


def exportar_empresa(empresa):
    """Serializa TODOS los datos de la empresa a un dict JSON-serializable.
    Es de solo lectura: no toca la base de datos."""

    datos = {}
    for app_label, model_name, lookup in MODELOS_EMPRESA:
        Model = django_apps.get_model(app_label, model_name)
        qs = Model.objects.filter(**{lookup: empresa}).order_by("pk")
        clave = f"{app_label}.{model_name.lower()}"
        datos[clave] = json.loads(django_serializers.serialize("json", qs))

    return {
        "version": 1,
        "exportado_en": timezone.now().isoformat(),
        "empresa_nombre": empresa.nombre,
        "datos": datos,
    }


def importar_empresa(empresa, payload):
    """Restaura un export de `exportar_empresa` DENTRO de `empresa`, que debe
    estar vacía (se verifica en la vista antes de llamar esto). Cada registro
    se crea con una PK nueva (nunca reutiliza las del export, para no chocar
    con otras empresas) y las relaciones se remapean con `pk_map`; las que
    apuntan a catálogos globales (no listados en MODELOS_EMPRESA) se dejan
    tal cual, asumiendo que ese catálogo ya existe en este servidor."""

    datos = payload.get("datos") or {}
    pk_map = {}  # "app.model" -> {pk_original: pk_nueva}

    for app_label, model_name, _lookup in MODELOS_EMPRESA:
        Model = django_apps.get_model(app_label, model_name)
        clave = f"{app_label}.{model_name.lower()}"
        registros = datos.get(clave, [])

        campos_relacion = {
            f.name: f
            for f in Model._meta.get_fields()
            if f.is_relation and (getattr(f, "concrete", False) or f.many_to_many)
        }
        campos_auto = [
            f.name
            for f in Model._meta.get_fields()
            if getattr(f, "auto_now_add", False) or getattr(f, "auto_now", False)
        ]

        mapa_nuevo = {}
        for registro in registros:
            pk_original = registro["pk"]
            valores = dict(registro["fields"])
            crear_kwargs = {}
            m2m_kwargs = {}

            for nombre, valor in valores.items():
                campo = campos_relacion.get(nombre)
                if campo is None:
                    crear_kwargs[nombre] = valor
                    continue

                relacionado = campo.related_model
                clave_relacionada = (
                    f"{relacionado._meta.app_label}.{relacionado._meta.model_name}"
                )

                if campo.many_to_many:
                    mapa = pk_map.get(clave_relacionada, {})
                    m2m_kwargs[nombre] = [mapa.get(v, v) for v in (valor or [])]
                    continue

                if nombre == "empresa":
                    crear_kwargs["empresa_id"] = empresa.pk
                    continue

                mapa = pk_map.get(clave_relacionada)
                if mapa is not None and valor is not None:
                    valor = mapa.get(valor, valor)
                crear_kwargs[f"{nombre}_id"] = valor

            objeto = Model.objects.create(**crear_kwargs)

            for nombre, ids in m2m_kwargs.items():
                getattr(objeto, nombre).set(ids)

            if campos_auto:
                # auto_now/auto_now_add ignoran el valor pasado a create(); se
                # restaura el original con un UPDATE que no dispara esa lógica.
                Model.objects.filter(pk=objeto.pk).update(
                    **{c: valores[c] for c in campos_auto if c in valores}
                )

            mapa_nuevo[pk_original] = objeto.pk

        pk_map[f"{app_label}.{model_name.lower()}"] = mapa_nuevo


def borrar_datos_empresa(empresa):
    from apps.assets.models import Activo, ClaseActivo, UbicacionTecnica
    from apps.bom.models import EquipoMaterial
    from apps.hr.models import Tecnico
    from apps.inventory.models import Almacen, Material, MovimientoStock, StockAlmacen, TrasladoAlmacen
    from apps.notices.models import Aviso
    from apps.pm_plans.models import PlanPreventivo
    from apps.production.models import LineaProduccion
    from apps.purchasing.models import OrdenCompra, Proveedor
    from apps.workorders.models import OrdenTrabajo

    OrdenCompra.objects.filter(material__empresa=empresa).delete()
    Proveedor.objects.filter(empresa=empresa).delete()
    OrdenTrabajo.objects.filter(empresa=empresa).delete()
    Aviso.objects.filter(empresa=empresa).delete()
    PlanPreventivo.objects.filter(activo__empresa=empresa).delete()
    EquipoMaterial.objects.filter(activo__empresa=empresa).delete()
    LineaProduccion.objects.filter(empresa=empresa).delete()
    StockAlmacen.objects.filter(material__empresa=empresa).delete()
    MovimientoStock.objects.filter(material__empresa=empresa).delete()
    TrasladoAlmacen.objects.filter(material__empresa=empresa).delete()
    Activo.objects.filter(empresa=empresa).delete()
    ClaseActivo.objects.filter(empresa=empresa).delete()
    UbicacionTecnica.objects.filter(empresa=empresa).delete()
    Material.objects.filter(empresa=empresa).delete()
    Almacen.objects.filter(empresa=empresa).delete()
    Tecnico.objects.filter(empresa=empresa).delete()
