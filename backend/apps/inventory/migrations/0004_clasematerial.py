import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0004_empresa_patron_codigo_registroauditoria"),
        ("inventory", "0003_stockalmacen_stock_maximo"),
    ]

    operations = [
        migrations.CreateModel(
            name="ClaseMaterial",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("codigo", models.CharField(max_length=30)),
                ("nombre", models.CharField(max_length=150)),
                ("descripcion", models.TextField(blank=True)),
                (
                    "empresa",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="clases_material",
                        to="companies.empresa",
                    ),
                ),
            ],
            options={
                "verbose_name": "Clase de material",
                "verbose_name_plural": "Clases de material",
                "ordering": ["codigo"],
            },
        ),
        migrations.AddConstraint(
            model_name="clasematerial",
            constraint=models.UniqueConstraint(
                fields=("empresa", "codigo"), name="clasematerial_empresa_codigo_unico"
            ),
        ),
        migrations.AddField(
            model_name="material",
            name="clase_catalogo",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="materiales",
                to="inventory.clasematerial",
            ),
        ),
    ]
