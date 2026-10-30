import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Dashboard', gestion: false },
  { to: '/activos', label: 'Activos', gestion: false },
  { to: '/avisos', label: 'Avisos', gestion: false },
  { to: '/ordenes', label: 'Órdenes de trabajo', gestion: false },
  { to: '/preventivo', label: 'Planes preventivos', gestion: true },
  { to: '/inventario', label: 'Inventario', gestion: false },
  { to: '/bom', label: 'BOM / Repuestos', gestion: true },
  { to: '/fallas', label: 'Catálogo de fallas', gestion: true },
  { to: '/compras', label: 'Compras', gestion: true },
  { to: '/produccion', label: 'Producción / OEE', gestion: true },
  { to: '/reportes', label: 'Reportes', gestion: false },
  { to: '/tecnicos', label: 'Técnicos', gestion: true },
]

export default function Layout() {
  const { logout, me, puedeGestionar } = useAuth()

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-200 flex flex-col">
        <div className="px-5 py-5 text-lg font-semibold text-white border-b border-slate-800">
          CMMS Libre
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links
            .filter((link) => !link.gestion || puedeGestionar)
            .map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-300'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-800 space-y-2">
          {me && (
            <div className="px-3 text-xs text-slate-400">
              <p className="text-slate-200 font-medium">{me.username}</p>
              <p>{me.rol_display}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 text-left"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-gray-100 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
