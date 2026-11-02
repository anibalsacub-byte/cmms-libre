from django.contrib import admin
from .models import PerfilUsuario


@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):
    list_display = ["usuario", "rol", "tecnico", "debe_cambiar_password"]
    list_filter = ["rol", "debe_cambiar_password"]
