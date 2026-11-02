from rest_framework.permissions import SAFE_METHODS, BasePermission


def _rol(request):
    perfil = getattr(request.user, "perfil", None)
    return perfil.rol if perfil else None


def _autenticado(request):
    return bool(request.user and request.user.is_authenticated)


class SoloAdministracionEscribe(BasePermission):
    """Lectura para cualquier usuario autenticado; escritura solo para
    planificador/administrador. Pensado para catálogos y módulos de gestión
    (activos, inventario, BOM, compras, producción, RR.HH., fallas)."""

    def has_permission(self, request, view):
        if not _autenticado(request):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _rol(request) in ("ADMINISTRADOR", "PLANIFICADOR")


class TecnicoEscribeAdministracionGestiona(BasePermission):
    """Lectura para cualquier usuario autenticado. Técnicos y superiores
    pueden crear/editar (p. ej. actualizar una OT). Pensado para órdenes de
    trabajo y avisos."""

    def has_permission(self, request, view):
        if not _autenticado(request):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _rol(request) in ("ADMINISTRADOR", "PLANIFICADOR", "TECNICO")


class CualquieraCreaSoloAdministracionEdita(BasePermission):
    """Cualquier usuario autenticado puede crear (reportar un aviso); editar,
    eliminar o acciones de gestión (convertir a OT, cerrar) requieren técnico
    o superior."""

    def has_permission(self, request, view):
        if not _autenticado(request):
            return False
        if request.method in SAFE_METHODS:
            return True
        if request.method == "POST" and getattr(view, "action", None) == "create":
            return True
        return _rol(request) in ("ADMINISTRADOR", "PLANIFICADOR", "TECNICO")
