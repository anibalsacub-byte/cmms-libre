from django.contrib import admin
from .models import LineaProduccion, RegistroProduccion, ImpactoOperativoFalla

admin.site.register(LineaProduccion)


@admin.register(RegistroProduccion)
class RegistroProduccionAdmin(admin.ModelAdmin):
    list_display = ["linea", "fecha", "turno", "unidades_producidas", "unidades_buenas"]
    list_filter = ["linea"]


@admin.register(ImpactoOperativoFalla)
class ImpactoOperativoFallaAdmin(admin.ModelAdmin):
    list_display = ["aviso", "linea", "unidades_perdidas", "costo_impacto"]
