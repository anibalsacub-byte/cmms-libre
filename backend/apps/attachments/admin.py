from django.contrib import admin
from .models import Adjunto


@admin.register(Adjunto)
class AdjuntoAdmin(admin.ModelAdmin):
    list_display = ["archivo", "aviso", "orden_trabajo", "subido_por", "subido_en"]
