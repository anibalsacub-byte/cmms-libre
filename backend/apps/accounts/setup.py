"""Creación del usuario administrador inicial (primer arranque o después de
restablecer la instalación). Compartido entre `iniciar.py` y el comando de
gestión `reiniciar_instalacion`. Pensado para el .exe de escritorio
(una sola persona, una sola empresa): se le crea su propia empresa, igual
que si se hubiera registrado por la web."""

from django.contrib.auth.models import User
from apps.companies.models import Empresa
from .constants import PASSWORD_INICIAL


def crear_admin_inicial():
    empresa = Empresa.objects.create(nombre="Mi Empresa")
    user = User.objects.create_superuser("admin", "admin@cmms.local", PASSWORD_INICIAL)
    perfil = user.perfil
    perfil.rol = "ADMINISTRADOR"
    perfil.empresa = empresa
    perfil.debe_cambiar_password = True
    perfil.save(update_fields=["rol", "empresa", "debe_cambiar_password"])
    return user
