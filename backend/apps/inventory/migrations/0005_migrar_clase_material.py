# Convierte la "clase" de material de texto libre a un catálogo propio por
# empresa (ClaseMaterial), igual que ya funciona para Activo. Agrupa los
# valores existentes por texto normalizado (mayúsculas/espacios) para no
# crear una clase distinta por cada variación de mayúsculas, y conserva el
# primer texto visto como nombre legible.

from django.db import migrations


def migrar(apps, schema_editor):
    Material = apps.get_model("inventory", "Material")
    ClaseMaterial = apps.get_model("inventory", "ClaseMaterial")

    materiales = Material.objects.exclude(clase="").exclude(clase__isnull=True).order_by("id")

    contador_por_empresa = {}
    clase_por_empresa_y_texto = {}

    for material in materiales:
        texto = material.clase.strip()
        if not texto:
            continue
        clave_normalizada = texto.lower()
        empresa_id = material.empresa_id
        clave = (empresa_id, clave_normalizada)

        clase = clase_por_empresa_y_texto.get(clave)
        if clase is None:
            siguiente = contador_por_empresa.get(empresa_id, 0) + 1
            contador_por_empresa[empresa_id] = siguiente
            clase = ClaseMaterial.objects.create(
                empresa_id=empresa_id, codigo=f"CM-{siguiente:03d}", nombre=texto
            )
            clase_por_empresa_y_texto[clave] = clase

        material.clase_catalogo_id = clase.id
        material.save(update_fields=["clase_catalogo"])


def revertir(apps, schema_editor):
    Material = apps.get_model("inventory", "Material")
    ClaseMaterial = apps.get_model("inventory", "ClaseMaterial")

    for material in Material.objects.exclude(clase_catalogo__isnull=True):
        material.clase = material.clase_catalogo.nombre
        material.save(update_fields=["clase"])

    ClaseMaterial.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0004_clasematerial"),
    ]

    operations = [
        migrations.RunPython(migrar, revertir),
    ]
