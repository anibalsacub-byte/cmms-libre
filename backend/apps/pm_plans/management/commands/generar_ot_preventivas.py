from django.core.management.base import BaseCommand
from apps.pm_plans.services import generar_ordenes_pendientes


class Command(BaseCommand):
    help = "Genera las OT preventivas de los planes vencidos (pensado para correr por cron/tarea programada)."

    def handle(self, *args, **options):
        ordenes = generar_ordenes_pendientes(usuario="cron")
        if not ordenes:
            self.stdout.write("No hay planes preventivos vencidos.")
            return
        for orden in ordenes:
            self.stdout.write(f"Generada {orden.numero} para {orden.activo.codigo}")
        self.stdout.write(self.style.SUCCESS(f"{len(ordenes)} OT generada(s)."))
