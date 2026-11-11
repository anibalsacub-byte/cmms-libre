"""Handler de excepciones de DRF: convierte los errores de integridad de
Django (borrar un registro todavía referenciado por otro, protegido con
on_delete=PROTECT) en una respuesta JSON legible en vez del 500 genérico
que lanzaría por defecto."""

from django.db.models.deletion import ProtectedError, RestrictedError
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework import status


def exception_handler(exc, context):
    if isinstance(exc, (ProtectedError, RestrictedError)):
        objetos = getattr(exc, "protected_objects", None) or getattr(exc, "restricted_objects", None)
        tipos = sorted({obj._meta.verbose_name for obj in objetos}) if objetos else []
        if tipos:
            detalle = "No se puede eliminar: todavía tiene " + ", ".join(tipos) + " asociado(s)."
        else:
            detalle = "No se puede eliminar: todavía tiene registros asociados."
        return Response({"detail": detalle}, status=status.HTTP_409_CONFLICT)

    return drf_exception_handler(exc, context)
