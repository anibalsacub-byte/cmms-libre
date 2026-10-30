from django.contrib import admin
from .models import Almacen, GrupoMaterial, Material, StockAlmacen, MovimientoStock, TrasladoAlmacen

admin.site.register(Almacen)
admin.site.register(GrupoMaterial)


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ["codigo", "descripcion", "grupo", "costo_unitario", "estado"]
    list_filter = ["grupo", "estado"]
    search_fields = ["codigo", "descripcion"]


@admin.register(StockAlmacen)
class StockAlmacenAdmin(admin.ModelAdmin):
    list_display = ["material", "almacen", "cantidad", "stock_minimo"]
    list_filter = ["almacen"]


@admin.register(MovimientoStock)
class MovimientoStockAdmin(admin.ModelAdmin):
    list_display = ["material", "almacen", "tipo", "cantidad", "fecha"]
    list_filter = ["tipo", "almacen"]


@admin.register(TrasladoAlmacen)
class TrasladoAlmacenAdmin(admin.ModelAdmin):
    list_display = ["material", "almacen_origen", "almacen_destino", "cantidad", "estado"]
    list_filter = ["estado"]
