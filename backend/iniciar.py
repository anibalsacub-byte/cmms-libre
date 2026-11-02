"""Punto de entrada para correr CMMS Libre como aplicación de escritorio:
levanta el backend (con el frontend ya compilado servido en la misma URL)
y abre el navegador.

Por defecto la base de datos **nace vacía**: solo se crea un usuario
`admin` con una contraseña conocida que hay que cambiar obligatoriamente
en el primer ingreso (pensado para enseñar a usarlo desde cero, igual que
una planilla de Excel en blanco, o para una empresa real que carga sus
propios datos).

Uso:
    python iniciar.py [--puerto 8000] [--red] [--sin-navegador] [--demo]

--red           escucha en 0.0.0.0 (otras PCs de la red local pueden entrar)
--sin-navegador no abre el navegador automáticamente
--demo          en vez de nacer vacío, carga una empresa de ejemplo ya
                llena (activos, avisos, OT, inventario...) con varios
                usuarios de demostración, uno por rol
"""

import argparse
import os
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
from apps.accounts.constants import PASSWORD_INICIAL  # noqa: E402
from apps.accounts.setup import crear_admin_inicial  # noqa: E402


def preparar_base_de_datos(cargar_demo: bool):
    call_command("migrate", verbosity=0, interactive=False)

    if User.objects.exists():
        return

    if cargar_demo:
        call_command("seed_demo")
        print("=" * 60)
        print("Usuarios de demostración creados (contraseña entre paréntesis):")
        print("  admin           (admin12345)   - Administrador")
        print("  planificador1   (demo12345)    - Planificador")
        print("  tecnico1        (demo12345)    - Técnico")
        print("  solicitante1    (demo12345)    - Solicitante")
        print("  lector1         (demo12345)    - Solo lectura")
        print("=" * 60)
        return

    crear_admin_inicial()
    print("=" * 60)
    print("Instalación nueva y vacía. Entra con:")
    print("  Usuario:     admin")
    print(f"  Contraseña:  {PASSWORD_INICIAL}")
    print("La app te pedirá cambiarla antes de dejarte usar el resto.")
    print(
        "(Un administrador puede cargar datos de demo o restablecer todo "
        "desde Configuración dentro de la app, sin consola.)"
    )
    print("=" * 60)


def abrir_navegador(url: str, retraso: float = 1.2):
    threading.Timer(retraso, lambda: webbrowser.open(url)).start()


def main():
    parser = argparse.ArgumentParser(description="Inicia CMMS Libre.")
    parser.add_argument("--puerto", type=int, default=8000)
    parser.add_argument("--red", action="store_true")
    parser.add_argument("--sin-navegador", action="store_true")
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Carga una empresa de ejemplo en vez de nacer vacío.",
    )
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
