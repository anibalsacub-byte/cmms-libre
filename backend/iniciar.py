"""Punto de entrada para correr CMMS Libre como aplicación de escritorio:
levanta el backend (con el frontend ya compilado servido en la misma URL),
crea un usuario administrador si no existe ninguno y abre el navegador.

Uso:
    python iniciar.py [--puerto 8000] [--red] [--sin-navegador] [--demo]

--red           escucha en 0.0.0.0 (otras PCs de la red local pueden entrar)
--sin-navegador no abre el navegador automáticamente
--demo          carga datos de demostración (equivalente a manage.py seed_demo)
"""

import argparse
import os
import secrets
import sys
import threading
import webbrowser

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402
import config.settings  # noqa: E402,F401  (fuerza a PyInstaller a incluirlo)

django.setup()

import config.urls  # noqa: E402,F401  (idem, arrastra config.views; requiere setup() antes)

from django.conf import settings  # noqa: E402
from django.contrib.auth.models import User  # noqa: E402
from django.core.management import call_command  # noqa: E402


def preparar_base_de_datos(cargar_demo: bool):
    call_command("migrate", verbosity=0, interactive=False)

    if cargar_demo:
        call_command("seed_demo")
        return

    if User.objects.filter(is_superuser=True).exists():
        return

    password = secrets.token_urlsafe(9)
    User.objects.create_superuser("admin", "admin@cmms.local", password)

    credenciales = settings.DATA_DIR / "credenciales_admin.txt"
    credenciales.write_text(
        f"Usuario: admin\nContraseña: {password}\n"
        "Guarda este archivo en un lugar seguro; puedes cambiar la contraseña "
        "desde Django admin una vez dentro.\n",
        encoding="utf-8",
    )
    print("=" * 60)
    print("Se creó un usuario administrador para esta instalación:")
    print(f"  Usuario:     admin")
    print(f"  Contraseña:  {password}")
    print(f"  (guardado también en {credenciales})")
    print("=" * 60)


def abrir_navegador(url: str, retraso: float = 1.2):
    threading.Timer(retraso, lambda: webbrowser.open(url)).start()


def main():
    parser = argparse.ArgumentParser(description="Inicia CMMS Libre.")
    parser.add_argument("--puerto", type=int, default=8000)
    parser.add_argument("--red", action="store_true")
    parser.add_argument("--sin-navegador", action="store_true")
    parser.add_argument("--demo", action="store_true")
    args = parser.parse_args()

    host = "0.0.0.0" if args.red else "127.0.0.1"
    preparar_base_de_datos(cargar_demo=args.demo)

    url = f"http://127.0.0.1:{args.puerto}/"
    print(f"CMMS Libre escuchando en {url}" + (" (y en la red local)" if args.red else ""))
    if not settings.FRONTEND_DIST_DIR.exists():
        print(
            "Aviso: no se encontró el frontend compilado en "
            f"{settings.FRONTEND_DIST_DIR}. Ejecuta 'npm run build' en frontend/."
        )

    if not args.sin_navegador:
        abrir_navegador(url)

    from waitress import serve
    from config.wsgi import application

    serve(application, host=host, port=args.puerto)


if __name__ == "__main__":
    main()
