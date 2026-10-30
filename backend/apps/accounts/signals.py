from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import PerfilUsuario


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def crear_perfil_usuario(sender, instance, created, **kwargs):
    if not created:
        return
    rol = "ADMINISTRADOR" if instance.is_superuser else "SOLO_LECTURA"
    PerfilUsuario.objects.get_or_create(usuario=instance, defaults={"rol": rol})
