from django.contrib import admin
from .models import Aviso


@admin.register(Aviso)
class AvisoAdmin(admin.ModelAdmin):
    list_display = ["numero", "activo", "prioridad", "estado", "fecha_reporte"]
    list_filter = ["estado", "prioridad"]
    search_fields = ["numero", "descripcion"]
