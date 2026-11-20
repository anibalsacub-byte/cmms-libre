# Amplía el catálogo base ISO 14224 (P1-6): de 3 síntomas/2 modos/1
# mecanismo/2 causas a un conjunto útil para equipo rotativo e industrial
# común (bombas, motores, compresores, válvulas, instrumentos). Idempotente
# (get_or_create por código/nombre) y reversible (borra exactamente los
# códigos que esta migración crea, sin tocar los anteriores ni datos que
# el usuario haya agregado con otros códigos).

from django.db import migrations

SINTOMAS = [
    "Sobrecalentamiento",
    "Olor a quemado",
    "Caída de presión",
    "Caudal o rendimiento insuficiente",
    "Parada inesperada",
    "Disparo de protección eléctrica",
]

MODOS = [
    ("MF-03", "Rotura de eje"),
    ("MF-04", "Falla de rodamiento por sobrecalentamiento"),
    ("MF-05", "Desalineación"),
    ("MF-06", "Desbalanceo de rotor"),
    ("MF-07", "Falla de aislamiento eléctrico"),
    ("MF-08", "Cortocircuito de bobinado"),
    ("MF-09", "Obstrucción de flujo"),
    ("MF-10", "Cavitación"),
    ("MF-11", "Falla de acople"),
    ("MF-12", "Falla de correa o transmisión"),
    ("MF-13", "Agarrotamiento (atascamiento)"),
    ("MF-14", "Pérdida de capacidad / bajo rendimiento"),
    ("MF-15", "Falla de válvula (no abre o no cierra)"),
    ("MF-16", "Falla de instrumento de medición"),
    ("MF-17", "Corrosión localizada"),
    ("MF-18", "Fisura por fatiga"),
    ("MF-19", "Falla de sello mecánico"),
    ("MF-20", "Sobrecalentamiento general"),
]

MECANISMOS = [
    ("MEC-02", "Corrosión"),
    ("MEC-03", "Desgaste abrasivo"),
    ("MEC-04", "Erosión"),
    ("MEC-05", "Sobrecalentamiento térmico"),
    ("MEC-06", "Falla eléctrica (cortocircuito o sobretensión)"),
    ("MEC-07", "Cavitación"),
    ("MEC-08", "Vibración excesiva"),
    ("MEC-09", "Contaminación del fluido o lubricante"),
    ("MEC-10", "Deformación plástica"),
]

CAUSAS = [
    ("CF-03", "Diseño inadecuado para la carga real", "DISENO"),
    ("CF-04", "Defecto de material de fabricación", "FABRICACION"),
    ("CF-05", "Montaje o alineación incorrecta", "INSTALACION"),
    ("CF-06", "Operación fuera de parámetros de diseño", "OPERACION"),
    ("CF-07", "Mantenimiento preventivo vencido u omitido", "MANTENIMIENTO"),
    ("CF-08", "Condiciones ambientales adversas", "EXTERNA"),
    ("CF-09", "Selección incorrecta de material", "DISENO"),
    ("CF-10", "Tolerancias de fabricación fuera de especificación", "FABRICACION"),
    ("CF-11", "Torque de ajuste incorrecto", "INSTALACION"),
    ("CF-12", "Arranques y paradas frecuentes", "OPERACION"),
    ("CF-13", "Repuesto o material incorrecto utilizado", "MANTENIMIENTO"),
    ("CF-14", "Falla de suministro eléctrico externo", "EXTERNA"),
    ("CF-15", "Falta de capacitación del operador", "OPERACION"),
    ("CF-16", "Procedimiento de mantenimiento no seguido", "MANTENIMIENTO"),
]


def poblar(apps, schema_editor):
    Sintoma = apps.get_model("failures", "Sintoma")
    ModoFalla = apps.get_model("failures", "ModoFalla")
    MecanismoFalla = apps.get_model("failures", "MecanismoFalla")
    CausaFalla = apps.get_model("failures", "CausaFalla")

    for nombre in SINTOMAS:
        Sintoma.objects.get_or_create(nombre=nombre)
    for codigo, nombre in MODOS:
        ModoFalla.objects.get_or_create(codigo=codigo, defaults={"nombre": nombre})
    for codigo, nombre in MECANISMOS:
        MecanismoFalla.objects.get_or_create(codigo=codigo, defaults={"nombre": nombre})
    for codigo, nombre, categoria in CAUSAS:
        CausaFalla.objects.get_or_create(
            codigo=codigo, defaults={"nombre": nombre, "categoria": categoria}
        )


def despoblar(apps, schema_editor):
    Sintoma = apps.get_model("failures", "Sintoma")
    ModoFalla = apps.get_model("failures", "ModoFalla")
    MecanismoFalla = apps.get_model("failures", "MecanismoFalla")
    CausaFalla = apps.get_model("failures", "CausaFalla")

    Sintoma.objects.filter(nombre__in=SINTOMAS).delete()
    ModoFalla.objects.filter(codigo__in=[c for c, _ in MODOS]).delete()
    MecanismoFalla.objects.filter(codigo__in=[c for c, _ in MECANISMOS]).delete()
    CausaFalla.objects.filter(codigo__in=[c for c, _, _ in CAUSAS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("failures", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(poblar, despoblar),
    ]
