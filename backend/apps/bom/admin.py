from django.contrib import admin
from .models import EquipoMaterial


@admin.register(EquipoMaterial)
class EquipoMaterialAdmin(admin.ModelAdmin):
    list_display = ["activo", "material", "cantidad_referencia"]
    search_fields = ["activo__codigo", "material__codigo"]
