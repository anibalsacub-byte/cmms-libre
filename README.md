# CMMS Libre

CMMS/EAM **libre y gratuito** (MIT), orientado a cubrir el alcance de un sistema de gestión de mantenimiento de
nivel empresarial (al estilo SAP PM / Fracttal / MaintainX) con un stack 100% open source: **Django + Django REST
Framework + PostgreSQL** en el backend y **React + TypeScript + Tailwind** en el frontend.

Es un proyecto independiente: no reutiliza código de terceros ni de otros proyectos del autor.

## Base normativa

| Norma | Uso en el sistema |
| --- | --- |
| **EN 13306** (terminología de mantenimiento) | Flujo aviso → decisión → orden de trabajo; tipos de mantenimiento (correctivo, preventivo, predictivo); estados de la OT |
| **ISO 14224** (recolección de datos de fiabilidad) | Catálogo de **modo de falla / mecanismo de falla / causa de falla** (`apps/failures`), usado en avisos y como base para Pareto de fallas |
| **ISO 55000/55001** (gestión de activos) | Jerarquía de ubicaciones técnicas, ficha técnica, criticidad, ciclo de vida del activo (`apps/assets`) |

## Referencias relevadas antes de diseñar el modelo de datos

- **SAP PM**: estructura de ubicación técnica / equipo (IH01/IE01), avisos (IW21) independientes de la orden
  (IW31), BOM técnico (IB01), códigos de transacción como acceso rápido.
- **MaintainX / Fracttal**: UX orientada al técnico de planta, checklists, solicitudes ciudadanas convertidas a OT.
- **Atlas CMMS** ([grashjs/cmms](https://github.com/grashjs/cmms)): CMMS open source más consolidado en GitHub
  (Java/Spring Boot + React, GPLv3/comercial dual), con OT, PM por disparadores, inventario y compras. Es la
  referencia de código abierto más completa disponible hoy; CMMS Libre cubre el mismo terreno con un stack
  Python/React y añade: avisos independientes de la OT, taxonomía ISO 14224 de fallas, multi-almacén con
  traslados, BOM equipo-repuesto, impacto operativo de fallas y OEE.
- Otros proyectos OSS relevados (más pequeños/menos maduros): `peteryu2833/cmms`, `SuperCMMS` (backend aún no
  productivo).

## Las 20 funciones solicitadas → módulo

| # | Función | Dónde vive |
| - | --- | --- |
| 1 | Activos y estructura técnica | `apps/assets` (UbicacionTecnica, ClaseActivo, Activo, ficha técnica, árbol técnico vía `padre`) |
| 2 | Avisos de mantenimiento | `apps/notices` (Aviso, independiente de la OT) |
| 3 | Órdenes de trabajo | `apps/workorders` (OrdenTrabajo, tareas, asignaciones, materiales, intentos, bitácora) |
| 4 | Planificación de RR.HH. | `apps/hr` (Tecnico, Especialidad, Habilidad, carga diaria) |
| 5 | Inventario de mantenimiento (MRO) | `apps/inventory` (Material, StockAlmacen, MovimientoStock) |
| 6 | Disponibilidad multi-almacén | `apps/inventory` (StockAlmacen por almacén, TrasladoAlmacen) |
| 7 | BOM / equipo-repuesto | `apps/bom` (EquipoMaterial) |
| 8 | Historial técnico del activo | API `GET /api/workorders/ordenes/?activo=<id>` + `GET /api/notices/avisos/?activo=<id>` |
| 9 | Fallas y diagnóstico (ISO 14224) | `apps/failures` (Sintoma, ModoFalla, MecanismoFalla, CausaFalla) enlazados al Aviso |
| 10 | Priorización (prioridad ≠ criticidad) | `Aviso.prioridad` / `OrdenTrabajo.prioridad` vs. `Activo.criticidad` |
| 11 | Backlog | `OrdenTrabajo.en_backlog` + `GET /api/kpis/dashboard/` |
| 12 | Costos de mantenimiento | `OrdenTrabajo.costo_mano_obra/costo_materiales/costo_total` |
| 13 | Compras y abastecimiento | `apps/purchasing` (SolicitudMaterial con fuente: stock/traslado/compra normal/emergencia; OrdenCompra) |
| 14 | Indicadores (MTBF, MTTR, disponibilidad, downtime, costos, backlog) | `apps/kpis/services.py` + `GET /api/kpis/dashboard/` |
| 15 | OEE | `apps/production` (RegistroProduccion con propiedades `disponibilidad/rendimiento/calidad/oee`) |
| 16 | Impacto operativo de fallas | `apps/production` (ImpactoOperativoFalla, ligado al Aviso) |
| 17 | Accesos rápidos tipo transacción | API REST documentada (ver más abajo); la navegación gráfica reemplaza los códigos |
| 18 | Directorio de técnicos | `apps/hr` + pantalla **Técnicos** |
| 19 | Trazabilidad de decisiones | `apps/workorders.BitacoraOT` (auditoría de cada cambio de estado) |
| 20 | Dashboard de gestión | Pantalla **Dashboard** (frontend) + `GET /api/kpis/dashboard/` |

## Alcance actual

Todos los módulos de la tabla anterior tienen pantalla propia en el frontend: **Dashboard, Activos, Avisos,
Órdenes de trabajo, Planes preventivos, Inventario, BOM/Repuestos, Catálogo de fallas, Compras, Producción/OEE,
Reportes y Técnicos**. Todo lo demás tiene además modelo de datos, API REST y administración completos.

### Roles y permisos

Cada usuario tiene un `PerfilUsuario.rol` (`apps/accounts`):

| Rol | Puede |
| --- | --- |
| **Administrador** | Todo (superusuario de Django) |
| **Planificador** | Todo excepto administración de Django |
| **Técnico** | Operar OT (tareas, materiales, cambios de estado, adjuntos), crear avisos; no administra catálogos/compras/activos |
| **Solicitante** | Solo reportar avisos (botón "Nuevo aviso") y ver todo en modo lectura |
| **Solo lectura** | Ver todo, no puede crear ni editar nada |

La lectura (`GET`) está abierta a cualquier usuario autenticado; la escritura se controla con clases de permiso
DRF por módulo (`apps/accounts/permissions.py`). El frontend oculta del menú los módulos de gestión y deshabilita
acciones según el rol devuelto por `GET /api/accounts/me/`.

### Mantenimiento preventivo

`apps/pm_plans`: planes por **calendario** (cada N días) o por **horómetro** (cada N horas de uso del activo).
El botón "Generar órdenes pendientes" (o el comando `manage.py generar_ot_preventivas`, pensado para cron) revisa
los planes vencidos, crea la OT preventiva con sus tareas plantilla y avanza el próximo vencimiento.

### Adjuntos

`apps/attachments`: fotos o PDF asociados a un aviso o a una OT (evidencia, respaldo del cierre técnico), subida
multipart y visible en el detalle de la OT.

### Reportes

`GET /api/kpis/pareto/` agrupa avisos por modo/mecanismo/causa de falla (ISO 14224) para priorizar qué atacar
primero; la pantalla **Reportes** lo grafica. `GET /api/workorders/ordenes/exportar-csv/` exporta las OT a CSV
(abrible en Excel) respetando los filtros aplicados.

## Arquitectura

```
cmms-libre/
  backend/                  Django 5 + DRF
    config/                 settings, urls
    apps/
      accounts/              Roles y permisos (PerfilUsuario, /api/accounts/me/)
      assets/                Activos y ubicaciones técnicas
      failures/               Catálogo ISO 14224 (modo/mecanismo/causa de falla)
      notices/                 Avisos
      workorders/               Órdenes de trabajo
      pm_plans/                  Planes de mantenimiento preventivo
      attachments/                 Adjuntos (fotos/PDF) de avisos y OT
      hr/                            Técnicos
      inventory/                      Materiales, almacenes, stock, traslados
      bom/                              Relación equipo-repuesto
      purchasing/                        Compras y solicitudes de material
      production/                         Líneas, registros OEE, impacto operativo
      kpis/                                 Indicadores y Pareto de fallas (sin modelos propios)
  frontend/                 React + TypeScript + Vite + Tailwind + Recharts
```

La API expone un router DRF por app bajo `/api/<app>/...` más `/api/kpis/dashboard/` y `/api/kpis/pareto/` para
el panel. Autenticación por token (`/api/auth/token/`). El panel `/admin` de Django cubre CRUD completo de todos
los módulos, incluida la asignación de roles.

### Roadmap sugerido (fase 3+)

- Reglas de codificación y validación de calidad de datos al dar de alta activos/materiales.
- Checklists de inspección/ronda con firma digital.
- Notificaciones (email/push) cuando un plan preventivo vence o el stock cae bajo el mínimo.

## Cómo correrlo

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py seed_demo   # datos de demostración + usuarios por rol
.venv\Scripts\python manage.py runserver
```

Por defecto usa **SQLite** (cero configuración). Para producción, defina `USE_POSTGRES=true` y las variables
`POSTGRES_*` en un archivo `.env` (ver `.env.example`).

`seed_demo` crea estos usuarios (contraseña `admin12345` para `admin`, `demo12345` para el resto):

| Usuario | Rol |
| --- | --- |
| `admin` | Administrador (superusuario) |
| `planificador1` | Planificador |
| `tecnico1` | Técnico (enlazado a la ficha de personal TEC-001) |
| `solicitante1` | Solicitante |
| `lector1` | Solo lectura |

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

El frontend espera la API en `http://127.0.0.1:8000/api` (configurable con `VITE_API_URL`).

## Licencia

MIT (ver [LICENSE](LICENSE)): uso, copia, modificación y distribución libres, también con fines comerciales,
conservando el aviso de copyright.
