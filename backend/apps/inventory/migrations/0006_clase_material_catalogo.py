from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0005_migrar_clase_material"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="material",
            name="clase",
        ),
        migrations.RenameField(
            model_name="material",
            old_name="clase_catalogo",
            new_name="clase",
        ),
    ]
