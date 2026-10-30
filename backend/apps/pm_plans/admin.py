from django.contrib import admin
from .models import PlanPreventivo


@admin.register(PlanPreventivo)
class PlanPreventivoAdmin(admin.ModelAdmin):
    list_display = ["nombre", "activo", "tipo", "fecha_proxima", "horometro_proximo", "activo_flag"]
    list_filter = ["tipo", "activo_flag"]
    search_fields = ["nombre", "activo__codigo"]
