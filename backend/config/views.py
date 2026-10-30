from django.conf import settings
from django.http import HttpResponse, HttpResponseNotFound


def frontend_index(request):
    """Sirve el index.html del frontend compilado (React Router se encarga
    del resto en el navegador)."""
    index_path = settings.FRONTEND_DIST_DIR / "index.html"
    if not index_path.exists():
        return HttpResponseNotFound(
            "Frontend no compilado. Ejecuta 'npm run build' en la carpeta frontend/."
        )
    return HttpResponse(index_path.read_text(encoding="utf-8"))
