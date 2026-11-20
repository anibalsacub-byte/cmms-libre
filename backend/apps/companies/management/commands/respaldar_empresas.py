import json

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.companies.models import Empresa
from apps.companies.services import exportar_empresa


class Command(BaseCommand):
    help = (
        "Respalda TODAS las empresas (una exportación JSON por empresa) en "
        "DATA_DIR/backups y borra los respaldos de más de 30 días. Pensado "
        "para correr una vez al día (P0-8).\n\n"
        "En el .exe de escritorio, DATA_DIR es una carpeta del usuario y el "
        "respaldo persiste entre reinicios: basta con programarlo en el "
        "Programador de tareas de Windows.\n\n"
        "En un servidor con disco EFÍMERO (como el plan gratuito de Render), "
        "este comando sigue funcionando, pero el archivo se pierde en el "
        "próximo despliegue o reinicio — para que el respaldo sea durable "
        "ahí hace falta un cron externo que llame a este comando Y copie el "
        "archivo resultante a almacenamiento persistente (o, más simple, usar "
        "«Exportar empresa» desde Configuración y guardarlo fuera del servidor)."
    )

    def handle(self, *args, **options):
        carpeta = settings.DATA_DIR / "backups"
        carpeta.mkdir(parents=True, exist_ok=True)

        from datetime import timedelta
        from django.utils import timezone

        hoy = timezone.now()
        total = 0
        for empresa in Empresa.objects.all():
            payload = exportar_empresa(empresa)
            nombre_archivo = f"empresa_{empresa.id}_{hoy.strftime('%Y%m%d_%H%M%S')}.json"
            (carpeta / nombre_archivo).write_text(
                json.dumps(payload, ensure_ascii=False), encoding="utf-8"
            )
            total += 1
            self.stdout.write(f"Respaldada «{empresa.nombre}» -> {nombre_archivo}")

        limite = hoy - timedelta(days=30)
        borrados = 0
        for archivo in carpeta.glob("empresa_*.json"):
            if archivo.stat().st_mtime < limite.timestamp():
                archivo.unlink()
                borrados += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"{total} empresa(s) respaldada(s); {borrados} respaldo(s) viejo(s) eliminado(s)."
            )
        )
