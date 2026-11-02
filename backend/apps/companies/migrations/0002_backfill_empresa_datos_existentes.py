from django.db import migrations


def backfill_empresa(apps, schema_editor):
    """Instalaciones que ya tenían datos ANTES de existir el campo `empresa`
    (p. ej. la instancia en la nube) quedan con filas en `empresa=NULL` tras
    agregar el campo. Como el aislamiento multiempresa trata `empresa=NULL`
    como "sin acceso", sin este backfill esos datos quedarían invisibles
    para su propio dueño. Los juntamos todos en una única empresa."""

    Empresa = apps.get_model("companies", "Empresa")
    PerfilUsuario = apps.get_model("accounts", "PerfilUsuario")
    Activo = apps.get_model("assets", "Activo")
    ClaseActivo = apps.get_model("assets", "ClaseActivo")
    UbicacionTecnica = apps.get_model("assets", "UbicacionTecnica")
    Tecnico = apps.get_model("hr", "Tecnico")
    Almacen = apps.get_model("inventory", "Almacen")
    Material = apps.get_model("inventory", "Material")
    Aviso = apps.get_model("notices", "Aviso")
    OrdenTrabajo = apps.get_model("workorders", "OrdenTrabajo")
    LineaProduccion = apps.get_model("production", "LineaProduccion")

    modelos_con_empresa = [
        PerfilUsuario,
        UbicacionTecnica,
        ClaseActivo,
        Activo,
        Tecnico,
        Almacen,
        Material,
        Aviso,
        OrdenTrabajo,
        LineaProduccion,
    ]

    if not any(m.objects.filter(empresa__isnull=True).exists() for m in modelos_con_empresa):
        return

    empresa, _ = Empresa.objects.get_or_create(nombre="Mi Empresa")
    for modelo in modelos_con_empresa:
        modelo.objects.filter(empresa__isnull=True).update(empresa=empresa)


def no_op(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("companies", "0001_initial"),
        ("accounts", "0003_perfilusuario_empresa"),
        ("assets", "0002_activo_empresa_claseactivo_empresa_and_more"),
        ("hr", "0002_tecnico_empresa_alter_tecnico_codigo_and_more"),
        ("inventory", "0002_almacen_empresa_material_empresa_and_more"),
        ("notices", "0002_aviso_empresa_alter_aviso_numero_and_more"),
        ("production", "0002_lineaproduccion_empresa_alter_lineaproduccion_codigo_and_more"),
        ("workorders", "0002_ordentrabajo_empresa_alter_ordentrabajo_numero_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_empresa, no_op),
    ]
