from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token

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
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
