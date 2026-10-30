from django.contrib import admin
from .models import OrdenCompra, SolicitudMaterial


@admin.register(OrdenCompra)
class OrdenCompraAdmin(admin.ModelAdmin):
    list_display = ["numero", "material", "tipo", "cantidad", "estado", "fecha_solicitud"]
    list_filter = ["tipo", "estado"]
    search_fields = ["numero", "proveedor"]


@admin.register(SolicitudMaterial)
class SolicitudMaterialAdmin(admin.ModelAdmin):
    list_display = ["orden_trabajo", "material", "cantidad", "fuente", "estado"]
    list_filter = ["fuente", "estado"]
