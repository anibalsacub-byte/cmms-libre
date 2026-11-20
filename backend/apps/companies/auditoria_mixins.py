"""Bitácora de auditoría global (P2-6): quién creó/editó/eliminó qué y
cuándo, en los módulos de negocio principales. Se combina con un ViewSet
que YA tenga `EmpresaScopedMixin` (para resolver `self._empresa()`),
colocado ANTES en la lista de bases para que sus `super().perform_*()`
encadenen correctamente a `EmpresaScopedMixin`."""


class AuditoriaMixin:
    def _registrar_auditoria(self, accion, modelo, objeto_id, objeto_str, empresa):
        from .models import RegistroAuditoria

        RegistroAuditoria.objects.create(
            empresa=empresa,
            usuario=getattr(self.request.user, "username", ""),
            accion=accion,
            modelo=modelo,
            objeto_id=objeto_id,
            objeto_str=objeto_str[:255],
        )

    def _datos_instancia(self, instancia):
        return (
            f"{instancia._meta.app_label}.{instancia._meta.model_name}",
            instancia.pk,
            str(instancia),
        )

    def perform_create(self, serializer):
        super().perform_create(serializer)
        modelo, objeto_id, objeto_str = self._datos_instancia(serializer.instance)
        self._registrar_auditoria("CREAR", modelo, objeto_id, objeto_str, self._empresa())

    def perform_update(self, serializer):
        super().perform_update(serializer)
        modelo, objeto_id, objeto_str = self._datos_instancia(serializer.instance)
        self._registrar_auditoria("EDITAR", modelo, objeto_id, objeto_str, self._empresa())

    def perform_destroy(self, instance):
        modelo, objeto_id, objeto_str = self._datos_instancia(instance)
        empresa = self._empresa()
        super().perform_destroy(instance)
        self._registrar_auditoria("ELIMINAR", modelo, objeto_id, objeto_str, empresa)
