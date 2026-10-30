from django.conf import settings
from django.db import models


class PerfilUsuario(models.Model):
    ROL_CHOICES = [
        ("ADMINISTRADOR", "Administrador"),
        ("PLANIFICADOR", "Planificador"),
        ("TECNICO", "Técnico"),
        ("SOLICITANTE", "Solicitante"),
        ("SOLO_LECTURA", "Solo lectura"),
    ]

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="perfil"
    )
    rol = models.CharField(max_length=20, choices=ROL_CHOICES, default="SOLO_LECTURA")
    tecnico = models.ForeignKey(
        "hr.Tecnico",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="usuarios",
        help_text="Si el usuario es técnico, enlaza con su ficha de personal.",
    )

    class Meta:
        verbose_name = "Perfil de usuario"
        verbose_name_plural = "Perfiles de usuario"

    def __str__(self):
        return f"{self.usuario.username} ({self.get_rol_display()})"

    def puede_escribir(self):
        return self.rol in ("ADMINISTRADOR", "PLANIFICADOR", "TECNICO")

    def puede_administrar(self):
        return self.rol in ("ADMINISTRADOR", "PLANIFICADOR")
