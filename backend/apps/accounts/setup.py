"""Creación del usuario administrador inicial (primer arranque o después de
restablecer la instalación). Compartido entre `iniciar.py` y el comando de
gestión `reiniciar_instalacion`."""

from django.contrib.auth.models import User
from .constants import PASSWORD_INICIAL


def crear_admin_inicial():
    user = User.objects.create_superuser("admin", "admin@cmms.local", PASSWORD_INICIAL)
    perfil = user.perfil
    perfil.debe_cambiar_password = True
    perfil.save(update_fields=["debe_cambiar_password"])
    return user
