"""Borrado de todos los datos de una empresa (no de otras), respetando el
orden de dependencias (FK con PROTECT) entre modelos. Usado por
'Restablecer instalación' en Configuración: borra los datos, no la cuenta
ni la empresa en sí."""


def borrar_datos_empresa(empresa):
    from apps.assets.models import Activo, ClaseActivo, UbicacionTecnica
    from apps.bom.models import EquipoMaterial
    from apps.hr.models import Tecnico
    from apps.inventory.models import Almacen, Material, MovimientoStock, StockAlmacen, TrasladoAlmacen
    from apps.notices.models import Aviso
    from apps.pm_plans.models import PlanPreventivo
    from apps.production.models import LineaProduccion
    from apps.purchasing.models import OrdenCompra
    from apps.workorders.models import OrdenTrabajo

    OrdenCompra.objects.filter(material__empresa=empresa).delete()
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
