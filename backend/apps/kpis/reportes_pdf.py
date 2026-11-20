"""Generación de reportes en PDF (P2-5) con reportlab. Sin dependencias de
sistema (a diferencia de wkhtmltopdf/weasyprint), así que no complica la
imagen Docker de Render ni el .exe de escritorio."""

import io

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet


def pdf_reporte_costos(empresa, datos):
    """`datos` es el dict que devuelve `services.reporte_costos`."""

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm, leftMargin=1.5 * cm, rightMargin=1.5 * cm,
    )
    estilos = getSampleStyleSheet()
    elementos = []

    elementos.append(Paragraph("Reporte de costos de mantenimiento", estilos["Title"]))
    elementos.append(
        Paragraph(
            f"{empresa.nombre if empresa else '—'} · últimos {datos['periodo_dias']} días · "
            f"generado el {timezone.now().strftime('%d/%m/%Y %H:%M')}",
            estilos["Normal"],
        )
    )
    elementos.append(Spacer(1, 0.5 * cm))
    elementos.append(
        Paragraph(
            f"<b>Costo total del período: S/ {datos['costo_total']:,.2f}</b> "
            f"({datos['numero_ot']} orden(es) de trabajo)",
            estilos["Normal"],
        )
    )
    elementos.append(Spacer(1, 0.8 * cm))

    elementos.append(Paragraph("Costo por activo", estilos["Heading2"]))
    filas_activo = [["Activo", "OT", "Costo (S/)"]]
    for a in datos["por_activo"]:
        filas_activo.append([f"{a['activo_codigo']} - {a['activo_nombre']}", str(a["numero_ot"]), f"{a['costo']:,.2f}"])
    if len(filas_activo) == 1:
        filas_activo.append(["Sin datos en el período.", "", ""])
    elementos.append(_tabla(filas_activo, anchos=[10 * cm, 2 * cm, 4 * cm]))
    elementos.append(Spacer(1, 0.8 * cm))

    elementos.append(Paragraph("Costo por ubicación técnica", estilos["Heading2"]))
    filas_ubicacion = [["Ubicación", "Costo (S/)"]]
    for u in datos["por_ubicacion"]:
        filas_ubicacion.append([f"{u['ubicacion_codigo']} - {u['ubicacion_nombre']}", f"{u['costo']:,.2f}"])
    if len(filas_ubicacion) == 1:
        filas_ubicacion.append(["Sin datos en el período.", ""])
    elementos.append(_tabla(filas_ubicacion, anchos=[12 * cm, 4 * cm]))

    doc.build(elementos)
    return buffer.getvalue()


def _tabla(filas, anchos):
    tabla = Table(filas, colWidths=anchos, repeatRows=1)
    tabla.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("ALIGN", (-1, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return tabla
