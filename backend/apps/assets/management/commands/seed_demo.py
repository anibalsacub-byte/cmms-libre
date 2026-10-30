import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone

from apps.hr.models import Especialidad, Habilidad, Tecnico
from apps.assets.models import UbicacionTecnica, ClaseActivo, Activo
from apps.failures.models import Sintoma, ModoFalla, MecanismoFalla, CausaFalla
from apps.inventory.models import Almacen, GrupoMaterial, Material, StockAlmacen
from apps.bom.models import EquipoMaterial
from apps.notices.models import Aviso
from apps.workorders.models import (
    OrdenTrabajo,
    TareaOT,
    AsignacionTecnico,
    MaterialUtilizado,
    BitacoraOT,
)
from apps.production.models import LineaProduccion, RegistroProduccion, ImpactoOperativoFalla


class Command(BaseCommand):
    help = "Carga datos de demostración para el CMMS Libre."

    def handle(self, *args, **options):
        self.stdout.write("Creando usuario admin (admin / admin12345)...")
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser("admin", "admin@cmms.local", "admin12345")

        self.stdout.write("Planta y ubicaciones técnicas...")
        planta = UbicacionTecnica.objects.create(codigo="PL-01", nombre="Planta Central")
        area_envasado = UbicacionTecnica.objects.create(
            codigo="PL-01-ENV", nombre="Área de envasado", padre=planta
        )
        area_utilities = UbicacionTecnica.objects.create(
            codigo="PL-01-UTI", nombre="Área de utilities", padre=planta
        )
        linea1 = UbicacionTecnica.objects.create(
            codigo="PL-01-ENV-L1", nombre="Línea de envasado 1", padre=area_envasado
        )

        self.stdout.write("Clases de activo...")
        clase_motor = ClaseActivo.objects.create(codigo="MOT", nombre="Motores eléctricos")
        clase_bomba = ClaseActivo.objects.create(codigo="BOM", nombre="Bombas centrífugas")
        clase_compresor = ClaseActivo.objects.create(codigo="COM", nombre="Compresores")

        self.stdout.write("Activos...")
        activo_motor = Activo.objects.create(
            codigo="EQ-0001",
            nombre="Motor transportador L1",
            clase=clase_motor,
            ubicacion_tecnica=linea1,
            sistema="Transporte",
            criticidad="ALTA",
            fabricante="WEG",
            modelo="W22-15HP",
            numero_serie="SN-10021",
            horas_operacion_acumuladas=8200,
        )
        activo_bomba = Activo.objects.create(
            codigo="EQ-0002",
            nombre="Bomba de llenado L1",
            clase=clase_bomba,
            ubicacion_tecnica=linea1,
            padre=activo_motor,
            sistema="Llenado",
            criticidad="ALTA",
            fabricante="Grundfos",
            modelo="CR-15",
            horas_operacion_acumuladas=6100,
        )
        activo_compresor = Activo.objects.create(
            codigo="EQ-0003",
            nombre="Compresor de aire planta",
            clase=clase_compresor,
            ubicacion_tecnica=area_utilities,
            sistema="Aire comprimido",
            criticidad="MEDIA",
            fabricante="Atlas Copco",
            modelo="GA-30",
            horas_operacion_acumuladas=15300,
        )

        self.stdout.write("Catálogo de fallas (ISO 14224)...")
        sintoma_vibra = Sintoma.objects.create(nombre="Vibración anormal")
        sintoma_ruido = Sintoma.objects.create(nombre="Ruido inusual")
        sintoma_fuga = Sintoma.objects.create(nombre="Fuga de fluido")
        modo_desgaste = ModoFalla.objects.create(codigo="MF-01", nombre="Desgaste de rodamiento")
        modo_fuga = ModoFalla.objects.create(codigo="MF-02", nombre="Fuga por sello")
        mecanismo_fatiga = MecanismoFalla.objects.create(codigo="MEC-01", nombre="Fatiga mecánica")
        causa_mantenimiento = CausaFalla.objects.create(
            codigo="CF-01", nombre="Lubricación insuficiente", categoria="MANTENIMIENTO"
        )
        causa_operacion = CausaFalla.objects.create(
            codigo="CF-02", nombre="Sobrecarga operativa", categoria="OPERACION"
        )

        self.stdout.write("Especialidades, habilidades y técnicos...")
        esp_mecanica = Especialidad.objects.create(nombre="Mecánica")
        esp_electrica = Especialidad.objects.create(nombre="Eléctrica")
        hab_soldadura = Habilidad.objects.create(nombre="Soldadura")
        hab_plc = Habilidad.objects.create(nombre="Programación PLC")

        tec1 = Tecnico.objects.create(
            codigo="TEC-001",
            nombre="Carlos Pérez",
            especialidad=esp_mecanica,
            tarifa_hora=12.50,
            productividad_pct=95,
            capacidad_diaria_horas=8,
        )
        tec1.habilidades.add(hab_soldadura)
        tec2 = Tecnico.objects.create(
            codigo="TEC-002",
            nombre="Ana Soto",
            especialidad=esp_electrica,
            tarifa_hora=14.00,
            productividad_pct=100,
            capacidad_diaria_horas=8,
        )
        tec2.habilidades.add(hab_plc)

        self.stdout.write("Almacenes, materiales y BOM...")
        almacen_central = Almacen.objects.create(codigo="ALM-01", nombre="Bodega central")
        almacen_linea = Almacen.objects.create(codigo="ALM-02", nombre="Bodega línea 1")
        grupo_rodamientos = GrupoMaterial.objects.create(nombre="Rodamientos")
        grupo_sellos = GrupoMaterial.objects.create(nombre="Sellos y empaquetaduras")

        mat_rodamiento = Material.objects.create(
            codigo="MAT-0001",
            descripcion="Rodamiento SKF 6205",
            grupo=grupo_rodamientos,
            unidad_medida="UN",
            costo_unitario=18.50,
            tiempo_entrega_dias=5,
        )
        mat_sello = Material.objects.create(
            codigo="MAT-0002",
            descripcion="Sello mecánico bomba CR-15",
            grupo=grupo_sellos,
            unidad_medida="UN",
            costo_unitario=42.00,
            tiempo_entrega_dias=10,
        )
        StockAlmacen.objects.create(
            material=mat_rodamiento, almacen=almacen_central, cantidad=12, stock_minimo=4
        )
        StockAlmacen.objects.create(
            material=mat_rodamiento, almacen=almacen_linea, cantidad=1, stock_minimo=2
        )
        StockAlmacen.objects.create(
            material=mat_sello, almacen=almacen_central, cantidad=2, stock_minimo=3
        )

        EquipoMaterial.objects.create(
            activo=activo_motor, material=mat_rodamiento, cantidad_referencia=2
        )
        EquipoMaterial.objects.create(
            activo=activo_bomba, material=mat_sello, cantidad_referencia=1
        )

        self.stdout.write("Avisos y orden de trabajo de ejemplo...")
        aviso1 = Aviso.objects.create(
            activo=activo_bomba,
            reportado_por="Operador Línea 1",
            descripcion="Se detecta fuga de líquido en la base de la bomba de llenado.",
            sintoma=sintoma_fuga,
            modo_falla=modo_fuga,
            mecanismo_falla=mecanismo_fatiga,
            causa_falla=causa_mantenimiento,
            prioridad="ALTA",
            afecta_produccion=True,
            tiempo_parada_horas=1.5,
        )
        aviso2 = Aviso.objects.create(
            activo=activo_motor,
            reportado_por="Operador Línea 1",
            descripcion="Vibración anormal en el motor del transportador.",
            sintoma=sintoma_vibra,
            modo_falla=modo_desgaste,
            causa_falla=causa_operacion,
            prioridad="MEDIA",
        )
        Aviso.objects.create(
            activo=activo_compresor,
            reportado_por="Supervisor Utilities",
            descripcion="Ruido inusual al arrancar el compresor.",
            sintoma=sintoma_ruido,
            prioridad="BAJA",
        )

        orden = OrdenTrabajo.objects.create(
            aviso=aviso1,
            activo=activo_bomba,
            tipo="CORRECTIVO",
            prioridad="ALTA",
            estado="CERRADA",
            descripcion=aviso1.descripcion,
            diagnostico="Sello mecánico desgastado por fatiga, falta de lubricación periódica.",
            trabajo_realizado="Reemplazo de sello mecánico y rodamiento. Prueba funcional OK.",
            tecnico_principal=tec1,
            fecha_planificada=timezone.now().date(),
            fecha_inicio=timezone.now() - timedelta(hours=3),
            fecha_fin=timezone.now() - timedelta(hours=1),
            tiempo_parada_horas=2.5,
        )
        aviso1.estado = "CONVERTIDO_OT"
        aviso1.save(update_fields=["estado"])

        TareaOT.objects.create(orden_trabajo=orden, descripcion="Bloqueo y etiquetado (LOTO)", completada=True, orden=1)
        TareaOT.objects.create(orden_trabajo=orden, descripcion="Desmontaje de bomba", completada=True, orden=2)
        TareaOT.objects.create(orden_trabajo=orden, descripcion="Reemplazo de sello y rodamiento", completada=True, orden=3)
        TareaOT.objects.create(orden_trabajo=orden, descripcion="Prueba funcional", completada=True, orden=4)

        AsignacionTecnico.objects.create(
            orden_trabajo=orden, tecnico=tec1, fecha=timezone.now().date(),
            horas_planificadas=3, horas_reales=2.5,
        )
        MaterialUtilizado.objects.create(
            orden_trabajo=orden, material=mat_sello, cantidad=1,
            costo_unitario=mat_sello.costo_unitario, fuente="STOCK_LOCAL",
        )
        MaterialUtilizado.objects.create(
            orden_trabajo=orden, material=mat_rodamiento, cantidad=1,
            costo_unitario=mat_rodamiento.costo_unitario, fuente="STOCK_LOCAL",
        )
        BitacoraOT.objects.create(orden_trabajo=orden, usuario="admin", evento="OT creada a partir de aviso AV")
        BitacoraOT.objects.create(orden_trabajo=orden, usuario="admin", evento="Estado: CREADA -> CERRADA")

        OrdenTrabajo.objects.create(
            aviso=aviso2,
            activo=activo_motor,
            tipo="CORRECTIVO",
            prioridad="MEDIA",
            estado="ASIGNADA",
            descripcion=aviso2.descripcion,
            tecnico_principal=tec2,
            fecha_planificada=timezone.now().date() + timedelta(days=1),
        )
        OrdenTrabajo.objects.create(
            activo=activo_compresor,
            tipo="PREVENTIVO",
            prioridad="BAJA",
            estado="PLANIFICADA",
            descripcion="Mantenimiento preventivo trimestral del compresor.",
            fecha_planificada=timezone.now().date() + timedelta(days=7),
        )

        self.stdout.write("Línea de producción y registros OEE...")
        linea_prod = LineaProduccion.objects.create(
            codigo="LP-01", nombre="Línea de envasado 1",
            velocidad_nominal=500, activo_principal=activo_motor,
        )
        hoy = timezone.now().date()
        for i in range(7):
            fecha = hoy - timedelta(days=i)
            producidas = random.randint(3200, 3900)
            buenas = round(producidas * random.uniform(0.95, 0.99))
            RegistroProduccion.objects.create(
                linea=linea_prod,
                fecha=fecha,
                turno="Día",
                tiempo_planificado_horas=8,
                tiempo_parada_horas=round(random.uniform(0, 1.5), 2),
                unidades_producidas=producidas,
                unidades_buenas=buenas,
            )

        ImpactoOperativoFalla.objects.create(
            aviso=aviso1,
            linea=linea_prod,
            afecta_disponibilidad=True,
            afecta_velocidad=False,
            afecta_calidad=False,
            unidades_perdidas=180,
            costo_impacto=540.00,
            notas="Parada de línea por fuga en bomba de llenado.",
        )

        self.stdout.write(self.style.SUCCESS("Datos de demostración cargados correctamente."))
