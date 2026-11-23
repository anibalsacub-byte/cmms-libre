"""Ajustes de stock compartidos: cualquier módulo que necesite mover stock
(movimientos manuales, recepción de traslados/compras, consumo de
materiales en una OT) pasa por aquí, para que la regla de "nunca negativo"
viva en un solo lugar."""

from rest_framework.exceptions import ValidationError

from .models import MovimientoStock, StockAlmacen


def ajustar_stock(material, almacen, delta):
    """Aplica `delta` (positivo o negativo) al StockAlmacen de ese par
    material/almacén; nunca lo deja negativo. Devuelve el StockAlmacen."""

    stock, _ = StockAlmacen.objects.get_or_create(material=material, almacen=almacen)
    nueva_cantidad = stock.cantidad + delta
    if nueva_cantidad < 0:
        raise ValidationError(
            {"cantidad": "No hay stock suficiente en ese almacén para este movimiento."}
        )
    stock.cantidad = nueva_cantidad
    stock.save(update_fields=["cantidad"])
    return stock


def registrar_movimiento(material, almacen, tipo, cantidad, referencia=""):
    """Crea un MovimientoStock y aplica su efecto al StockAlmacen
    correspondiente; si no hay stock suficiente, no crea nada."""

    if tipo == "ENTRADA":
        delta = cantidad
    elif tipo == "SALIDA":
        delta = -cantidad
    else:
        delta = cantidad  # AJUSTE: la cantidad ES el delta (puede ser negativo)

    ajustar_stock(material, almacen, delta)
    return MovimientoStock.objects.create(
        material=material, almacen=almacen, tipo=tipo, cantidad=cantidad, referencia=referencia
    )
