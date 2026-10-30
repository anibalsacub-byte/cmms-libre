from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", obtain_auth_token, name="api-token-auth"),
    path("api/hr/", include("apps.hr.urls")),
    path("api/assets/", include("apps.assets.urls")),
    path("api/failures/", include("apps.failures.urls")),
    path("api/notices/", include("apps.notices.urls")),
    path("api/inventory/", include("apps.inventory.urls")),
    path("api/bom/", include("apps.bom.urls")),
    path("api/purchasing/", include("apps.purchasing.urls")),
    path("api/production/", include("apps.production.urls")),
    path("api/workorders/", include("apps.workorders.urls")),
    path("api/kpis/", include("apps.kpis.urls")),
]
