from rest_framework.exceptions import PermissionDenied


class EmpresaScopedMixin:
    """Aísla un ViewSet por la empresa del usuario autenticado.

    - Modelos con FK directa `empresa`: se filtra por ella y se estampa sola
      al crear (no hace falta que el usuario la mande).
    - Modelos "hijos" sin FK propia (una tarea de una OT, un stock de un
      almacén...): se filtra atravesando la relación con `empresa_lookup`
      (ej. "orden_trabajo__empresa") y se valida, al crear, que el objeto
      padre (`parent_field`) pertenezca a la misma empresa — si no, se
      rechaza (evita que alguien enganche su fila a datos de otra empresa).
    """

    empresa_lookup = "empresa"
    parent_field = None  # solo para modelos hijos sin FK `empresa` propia

    def _empresa(self):
        perfil = getattr(self.request.user, "perfil", None)
        return perfil.empresa if perfil else None

    def get_queryset(self):
        qs = super().get_queryset()
        empresa = self._empresa()
        if empresa is None:
            return qs.none()
        return qs.filter(**{self.empresa_lookup: empresa})

    def perform_create(self, serializer):
        empresa = self._empresa()
        if self.parent_field:
            padre = serializer.validated_data.get(self.parent_field)
            if padre is not None and getattr(padre, "empresa_id", None) != getattr(empresa, "id", None):
                raise PermissionDenied("Ese registro pertenece a otra empresa.")
            serializer.save()
        else:
            serializer.save(empresa=empresa)
