from django.contrib import admin
from .models import UbicacionTecnica, ClaseActivo, Activo, FichaTecnicaCampo


@admin.register(UbicacionTecnica)
class UbicacionTecnicaAdmin(admin.ModelAdmin):
    list_display = ["codigo", "nombre", "padre", "nivel"]
    search_fields = ["codigo", "nombre"]


@admin.register(ClaseActivo)
class ClaseActivoAdmin(admin.ModelAdmin):
    search_fields = ["codigo", "nombre"]


class FichaTecnicaInline(admin.TabularInline):
    model = FichaTecnicaCampo
    extra = 1


@admin.register(Activo)
class ActivoAdmin(admin.ModelAdmin):
    list_display = ["codigo", "nombre", "clase", "ubicacion_tecnica", "criticidad", "estado"]
    list_filter = ["clase", "criticidad", "estado"]
    search_fields = ["codigo", "nombre", "numero_serie"]
    inlines = [FichaTecnicaInline]
