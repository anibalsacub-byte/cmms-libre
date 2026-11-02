"""Django settings for the CMMS Libre project."""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# En el .exe empaquetado con PyInstaller, el código y los recursos de solo
# lectura (migraciones, frontend compilado) viven en sys._MEIPASS.
if getattr(sys, "frozen", False):
    BASE_DIR = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
else:
    BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

# Carpeta donde se escriben datos (base de datos, media, estáticos
# recolectados): nunca dentro del bundle del .exe, que es de solo lectura.
if os.environ.get("CMMS_LIBRE_DATA_DIR"):
    DATA_DIR = Path(os.environ["CMMS_LIBRE_DATA_DIR"])
elif getattr(sys, "frozen", False):
    DATA_DIR = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "CMMSLibre"
else:
    DATA_DIR = BASE_DIR
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Frontend ya compilado (`npm run build`), servido directamente por Django.
if getattr(sys, "frozen", False):
    FRONTEND_DIST_DIR = BASE_DIR / "frontend_dist"
else:
    FRONTEND_DIST_DIR = BASE_DIR.parent / "frontend" / "dist"

# En el .exe, el AppDirectoriesFinder de staticfiles no resuelve bien las
# rutas de los paquetes empaquetados por PyInstaller; se sirven en cambio
# desde una carpeta pre-recolectada con `manage.py collectstatic` antes de
# construir el ejecutable (ver construir_exe_windows.bat).
STATIC_BUNDLE_DIR = BASE_DIR / "static_collected" if getattr(sys, "frozen", False) else None

SECRET_KEY = os.environ.get(
    "SECRET_KEY", "django-insecure-change-me-in-production-b!a1x^gddv!r@@f"
)

DEBUG = os.environ.get(
    "DEBUG", "false" if getattr(sys, "frozen", False) else "true"
).lower() == "true"

ALLOWED_HOSTS = [
    h for h in os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h
]
# Render asigna el dominio público en esta variable; se agrega sola, sin
# tener que conocerla de antemano al configurar ALLOWED_HOSTS a mano. Render
# termina el HTTPS en su proxy y reenvía por HTTP puertas adentro, así que
# también hay que decirle a Django que confíe en el encabezado que indica
# que el pedido original sí llegó por HTTPS (si no, el admin/CSRF fallan).
CSRF_TRUSTED_ORIGINS = []
if os.environ.get("RENDER_EXTERNAL_HOSTNAME"):
    _render_host = os.environ["RENDER_EXTERNAL_HOSTNAME"]
    ALLOWED_HOSTS.append(_render_host)
    CSRF_TRUSTED_ORIGINS.append(f"https://{_render_host}")
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "django_filters",
    "corsheaders",
    "apps.accounts",
    "apps.hr",
    "apps.assets",
    "apps.failures",
    "apps.notices",
    "apps.inventory",
    "apps.bom",
    "apps.production",
    "apps.purchasing",
    "apps.workorders",
    "apps.pm_plans",
    "apps.attachments",
    "apps.kpis",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database.
# SQLite por defecto para arrancar sin dependencias (desarrollo local, .exe).
# Para producción en la nube (Render + Neon/Supabase/etc.), definir la
# variable DATABASE_URL (postgres://usuario:clave@host:5432/basededatos).
# También se acepta USE_POSTGRES=true con las variables POSTGRES_* sueltas,
# por si se prefiere configurarlo campo a campo en vez de una URL.
if os.environ.get("DATABASE_URL"):
    import dj_database_url

    DATABASES = {
        "default": dj_database_url.parse(
            os.environ["DATABASE_URL"], conn_max_age=600, ssl_require=True
        )
    }
elif os.environ.get("USE_POSTGRES", "false").lower() == "true":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("POSTGRES_DB", "cmms"),
            "USER": os.environ.get("POSTGRES_USER", "cmms"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "cmms"),
            "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": DATA_DIR / "db.sqlite3",
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


LANGUAGE_CODE = "es"
TIME_ZONE = os.environ.get("TIME_ZONE", "America/Santiago")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = DATA_DIR / "staticfiles"

MEDIA_URL = "media/"
MEDIA_ROOT = DATA_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
}

CORS_ALLOWED_ORIGINS = [
    o
    for o in os.environ.get(
        "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if o
]
