from datetime import timedelta

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from apps.assets.models import Activo, ClaseActivo, UbicacionTecnica
from apps.companies.models import Empresa
from apps.hr.models import Especialidad, Tecnico
from apps.inventory.models import GrupoMaterial, Material
from apps.pm_plans.models import PlanPreventivo
from apps.workorders.models import AsignacionTecnico, MaterialUtilizado, OrdenTrabajo

from .services import kpis_mantenimiento, reporte_costos

# Límite generoso: el número de consultas no debe crecer con la cantidad de
# OT/planes (regresión N+1), pero deja margen para cambios menores en el
# número de consultas fijas que no dependen de la cantidad de filas.
MAX_QUERIES_DASHBOARD = 20
MAX_QUERIES_REPORTE_COSTOS = 10


class KpisQueryCountTests(TestCase):
    """Verifica que kpis_mantenimiento/reporte_costos no hagan N+1 consultas
    al recorrer OT (asignaciones/materiales) ni al revisar planes preventivos
    vencidos, y que los valores calculados sigan siendo correctos."""

    @classmethod
    def setUpTestData(cls):
        cls.empresa = Empresa.objects.create(nombre="Empresa Test")
        clase = ClaseActivo.objects.create(empresa=cls.empresa, codigo="CL1", nombre="Clase 1")
        ubicacion = UbicacionTecnica.objects.create(
            empresa=cls.empresa, codigo="UB1", nombre="Ubicación 1"
        )
        cls.activos = [
            Activo.objects.create(
                empresa=cls.empresa,
                codigo=f"ACT-{i}",
                nombre=f"Activo {i}",
                clase=clase,
                ubicacion_tecnica=ubicacion,
                estado="OPERATIVO",
                horas_operacion_acumuladas=1000,
            )
            for i in range(3)
        ]
        especialidad = Especialidad.objects.create(nombre="Mecánica")
        cls.tecnicos = [
            Tecnico.objects.create(
                empresa=cls.empresa,
                codigo=f"TEC-{i}",
                nombre=f"Técnico {i}",
                especialidad=especialidad,
                tarifa_hora=10,
            )
            for i in range(2)
        ]
        grupo = GrupoMaterial.objects.create(nombre="Repuestos")
        cls.materiales = [
            Material.objects.create(
                empresa=cls.empresa,
                codigo=f"MAT-{i}",
                descripcion=f"Material {i}",
                grupo=grupo,
                costo_unitario=5,
            )
            for i in range(2)
        ]

    def _crear_ots(self, cantidad, tipo="CORRECTIVO"):
        ahora = timezone.now()
        ots = []
        for i in range(cantidad):
            activo = self.activos[i % len(self.activos)]
            ot = OrdenTrabajo.objects.create(
                empresa=self.empresa,
                activo=activo,
                tipo=tipo,
                estado="CERRADA" if i % 2 == 0 else "ASIGNADA",
                descripcion=f"OT {i}",
                tiempo_parada_horas=2,
            )
            # fecha_creacion es auto_now_add: se ajusta aparte para que caiga
            # dentro del período de la consulta.
            OrdenTrabajo.objects.filter(pk=ot.pk).update(fecha_creacion=ahora - timedelta(days=1))
            AsignacionTecnico.objects.create(
                orden_trabajo=ot,
                tecnico=self.tecnicos[i % len(self.tecnicos)],
                fecha=ahora.date(),
                horas_planificadas=4,
                horas_reales=3,
            )
            MaterialUtilizado.objects.create(
                orden_trabajo=ot,
                material=self.materiales[i % len(self.materiales)],
                cantidad=2,
                costo_unitario=5,
                fuente="COMPRA_NORMAL",
            )
            ot.refresh_from_db()
            ots.append(ot)
        return ots

    def _crear_planes(self, cantidad):
        for i in range(cantidad):
            activo = self.activos[i % len(self.activos)]
            if i % 2 == 0:
                PlanPreventivo.objects.create(
                    activo=activo,
                    nombre=f"Plan calendario {i}",
                    tipo="CALENDARIO",
                    frecuencia_dias=30,
                    fecha_proxima=timezone.now().date() - timedelta(days=1),
                )
            else:
                PlanPreventivo.objects.create(
                    activo=activo,
                    nombre=f"Plan horómetro {i}",
                    tipo="HOROMETRO",
                    frecuencia_horas=500,
                    horometro_proximo=activo.horas_operacion_acumuladas + 500,
                )

    def test_dashboard_query_count_no_crece_con_mas_ot(self):
        self._crear_ots(5)
        self._crear_planes(2)
        with CaptureQueriesContext(connection) as ctx_pocas:
            kpis_mantenimiento(self.empresa, dias=90)
        n_queries_pocas = len(ctx_pocas.captured_queries)

        self._crear_ots(25)  # ahora 30 OT en total
        self._crear_planes(18)  # ahora 20 planes en total
        with CaptureQueriesContext(connection) as ctx_muchas:
            kpis_mantenimiento(self.empresa, dias=90)
        n_queries_muchas = len(ctx_muchas.captured_queries)

        self.assertEqual(n_queries_pocas, n_queries_muchas)
        self.assertLessEqual(n_queries_muchas, MAX_QUERIES_DASHBOARD)

    def test_reporte_costos_query_count_no_crece_con_mas_ot(self):
        self._crear_ots(5)
        with CaptureQueriesContext(connection) as ctx_pocas:
            reporte_costos(self.empresa, dias=90)
        n_queries_pocas = len(ctx_pocas.captured_queries)

        self._crear_ots(25)  # ahora 30 OT en total
        with CaptureQueriesContext(connection) as ctx_muchas:
            reporte_costos(self.empresa, dias=90)
        n_queries_muchas = len(ctx_muchas.captured_queries)

        self.assertEqual(n_queries_pocas, n_queries_muchas)
        self.assertLessEqual(n_queries_muchas, MAX_QUERIES_REPORTE_COSTOS)

    def test_valores_siguen_siendo_correctos(self):
        activo = self.activos[0]
        tec_a, tec_b = self.tecnicos
        tec_a.tarifa_hora = 100
        tec_a.save()
        tec_b.tarifa_hora = 50
        tec_b.save()
        mat_a, mat_b = self.materiales
        mat_a.costo_unitario = 10
        mat_a.save()
        mat_b.costo_unitario = 20
        mat_b.save()

        ahora = timezone.now()

        ot1 = OrdenTrabajo.objects.create(
            empresa=self.empresa, activo=activo, tipo="CORRECTIVO", estado="CERRADA",
            descripcion="OT1", tiempo_parada_horas=3,
        )
        AsignacionTecnico.objects.create(
            orden_trabajo=ot1, tecnico=tec_a, fecha=ahora.date(), horas_reales=2,
        )
        MaterialUtilizado.objects.create(
            orden_trabajo=ot1, material=mat_a, cantidad=3, costo_unitario=mat_a.costo_unitario,
        )
        # costo_total ot1 = 2h * 100 + 3 * 10 = 200 + 30 = 230

        ot2 = OrdenTrabajo.objects.create(
            empresa=self.empresa, activo=activo, tipo="CORRECTIVO", estado="CERRADA",
            descripcion="OT2", tiempo_parada_horas=5,
        )
        AsignacionTecnico.objects.create(
            orden_trabajo=ot2, tecnico=tec_b, fecha=ahora.date(), horas_reales=4,
        )
        MaterialUtilizado.objects.create(
            orden_trabajo=ot2, material=mat_b, cantidad=1, costo_unitario=mat_b.costo_unitario,
        )
        # costo_total ot2 = 4h * 50 + 1 * 20 = 200 + 20 = 220

        ot3 = OrdenTrabajo.objects.create(
            empresa=self.empresa, activo=activo, tipo="PREVENTIVO", estado="ASIGNADA",
            descripcion="OT3 abierta", tiempo_parada_horas=0,
        )
        AsignacionTecnico.objects.create(
            orden_trabajo=ot3, tecnico=tec_a, fecha=ahora.date(), horas_reales=1,
        )
        MaterialUtilizado.objects.create(
            orden_trabajo=ot3, material=mat_a, cantidad=2, costo_unitario=mat_a.costo_unitario,
        )
        # costo_total ot3 = 1h * 100 + 2 * 10 = 100 + 20 = 120

        for ot, dias_atras in ((ot1, 1), (ot2, 1), (ot3, 10)):
            OrdenTrabajo.objects.filter(pk=ot.pk).update(
                fecha_creacion=ahora - timedelta(days=dias_atras)
            )

        # 1 plan vencido, 1 no vencido -> 50% de cumplimiento.
        PlanPreventivo.objects.create(
            activo=activo, nombre="Vencido", tipo="CALENDARIO", frecuencia_dias=30,
            fecha_proxima=ahora.date() - timedelta(days=1),
        )
        PlanPreventivo.objects.create(
            activo=activo, nombre="No vencido", tipo="CALENDARIO", frecuencia_dias=30,
            fecha_proxima=ahora.date() + timedelta(days=30),
        )

        resultado = kpis_mantenimiento(self.empresa, dias=30)

        self.assertEqual(resultado["numero_fallas"], 2)
        self.assertEqual(resultado["downtime_horas"], 8.0)
        self.assertEqual(resultado["mttr_horas"], 4.0)
        self.assertEqual(resultado["costo_mantenimiento"], 450.0)  # solo correctivas: 230 + 220
        self.assertEqual(resultado["backlog"], 1)  # solo ot3 sigue abierta
        self.assertEqual(resultado["ordenes_trabajo_abiertas"], 1)
        self.assertEqual(resultado["pct_preventivo"], round(1 / 3 * 100, 1))
        self.assertEqual(resultado["pct_correctivo"], round(2 / 3 * 100, 1))
        self.assertEqual(resultado["cumplimiento_preventivo_pct"], 50.0)
        self.assertEqual(resultado["total_planes_preventivos_activos"], 2)
        self.assertAlmostEqual(
            resultado["edad_promedio_ot_abiertas_dias"], 10.0, delta=0.01
        )
        costo_por_activo = {c["activo_codigo"]: c["costo"] for c in resultado["costo_por_activo"]}
        self.assertEqual(costo_por_activo[activo.codigo], 570.0)  # 230 + 220 + 120

        reporte = reporte_costos(self.empresa, dias=30)
        self.assertEqual(reporte["numero_ot"], 3)
        self.assertEqual(reporte["costo_total"], 570.0)
        self.assertEqual(len(reporte["por_activo"]), 1)
        self.assertEqual(reporte["por_activo"][0]["costo"], 570.0)
        self.assertEqual(reporte["por_activo"][0]["numero_ot"], 3)
