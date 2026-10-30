from django.contrib import admin
from .models import Especialidad, Habilidad, Tecnico


@admin.register(Especialidad)
class EspecialidadAdmin(admin.ModelAdmin):
    search_fields = ["nombre"]


@admin.register(Habilidad)
class HabilidadAdmin(admin.ModelAdmin):
    search_fields = ["nombre"]


@admin.register(Tecnico)
class TecnicoAdmin(admin.ModelAdmin):
    list_display = ["codigo", "nombre", "especialidad", "disponible", "activo"]
    list_filter = ["especialidad", "disponible", "activo"]
    search_fields = ["codigo", "nombre"]
