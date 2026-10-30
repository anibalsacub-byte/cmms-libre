from django.conf import settings
from django.contrib import admin
from django.contrib.staticfiles.views import serve as serve_staticfiles
from django.urls import path, include, re_path
from django.views.static import serve as serve_static
from rest_framework.authtoken.views import obtain_auth_token

from .views import frontend_index

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", obtain_auth_token, name="api-token-auth"),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/hr/", include("apps.hr.urls")),
    path("api/assets/", include("apps.assets.urls")),
    path("api/failures/", include("apps.failures.urls")),
    path("api/notices/", include("apps.notices.urls")),
    path("api/inventory/", include("apps.inventory.urls")),
    path("api/bom/", include("apps.bom.urls")),
    path("api/purchasing/", include("apps.purchasing.urls")),
    path("api/production/", include("apps.production.urls")),
    path("api/workorders/", include("apps.workorders.urls")),
    path("api/pm-plans/", include("apps.pm_plans.urls")),
    path("api/attachments/", include("apps.attachments.urls")),
    path("api/kpis/", include("apps.kpis.urls")),
    # Media y estáticos: servidos siempre (no solo en DEBUG), ya que esta app
    # corre como aplicación de escritorio local, no como servidor público.
    re_path(
        r"^media/(?P<path>.*)$", serve_static, {"document_root": settings.MEDIA_ROOT}
    ),
    # En desarrollo, usa el finder de staticfiles (busca en cada app, p. ej.
    # admin/DRF) sin depender de `collectstatic`. En el .exe empaquetado,
    # sirve desde la carpeta pre-recolectada (ver settings.STATIC_BUNDLE_DIR).
    re_path(
        r"^static/(?P<path>.*)$",
        serve_static if settings.STATIC_BUNDLE_DIR else serve_staticfiles,
        {"document_root": settings.STATIC_BUNDLE_DIR} if settings.STATIC_BUNDLE_DIR else {},
    ),
]

if settings.FRONTEND_DIST_DIR.exists():
    urlpatterns += [
        # Bundle del frontend (JS/CSS compilados por Vite).
        re_path(
            r"^assets/(?P<path>.*)$",
            serve_static,
            {"document_root": settings.FRONTEND_DIST_DIR / "assets"},
        ),
        # Cualquier otra ruta (activos, avisos, ordenes, ...) la resuelve el
        # router de React: siempre se devuelve el index.html compilado.
        re_path(r"^(?!api/|admin/|media/|static/).*$", frontend_index),
    ]
