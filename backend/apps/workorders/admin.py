from django.contrib import admin
from .models import (
    OrdenTrabajo,
    TareaOT,
    AsignacionTecnico,
    MaterialUtilizado,
    IntentoReparacion,
    BitacoraOT,
)


class TareaOTInline(admin.TabularInline):
    model = TareaOT
    extra = 1


class AsignacionTecnicoInline(admin.TabularInline):
    model = AsignacionTecnico
    extra = 1


class MaterialUtilizadoInline(admin.TabularInline):
    model = MaterialUtilizado
    extra = 1


class IntentoReparacionInline(admin.TabularInline):
    model = IntentoReparacion
    extra = 0


class BitacoraOTInline(admin.TabularInline):
    model = BitacoraOT
    extra = 0
    readonly_fields = ["fecha"]


@admin.register(OrdenTrabajo)
class OrdenTrabajoAdmin(admin.ModelAdmin):
    list_display = ["numero", "activo", "tipo", "prioridad", "estado", "fecha_creacion"]
    list_filter = ["tipo", "prioridad", "estado"]
    search_fields = ["numero", "descripcion"]
    inlines = [
        TareaOTInline,
        AsignacionTecnicoInline,
        MaterialUtilizadoInline,
        IntentoReparacionInline,
        BitacoraOTInline,
    ]
