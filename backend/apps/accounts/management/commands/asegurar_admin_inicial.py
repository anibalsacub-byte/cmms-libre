from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from apps.accounts.constants import PASSWORD_INICIAL
from apps.accounts.setup import crear_admin_inicial


class Command(BaseCommand):
    help = (
        "Crea el usuario admin inicial (con cambio de contraseña obligatorio) "
        "si la base de datos todavía no tiene ningún usuario. Pensado para "
        "correr en cada deploy en la nube, antes de levantar el servidor."
    )

    def handle(self, *args, **options):
        if User.objects.exists():
            self.stdout.write("Ya hay usuarios; no se crea nada.")
            return

        crear_admin_inicial()
        self.stdout.write(
            self.style.SUCCESS(
                f"Usuario admin creado (contraseña inicial: {PASSWORD_INICIAL}, "
                "cambio obligatorio al entrar)."
            )
        )
