from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.accounts.setup import crear_admin_inicial


class Command(BaseCommand):
    help = (
        "Borra TODOS los datos (activos, avisos, OT, inventario, usuarios, "
        "etc.) y deja la instalación como recién instalada, con un único "
        "usuario admin que debe cambiar su contraseña al entrar."
    )

    def handle(self, *args, **options):
        call_command("flush", interactive=False, verbosity=0)
        crear_admin_inicial()
        self.stdout.write(self.style.SUCCESS("Instalación restablecida."))
