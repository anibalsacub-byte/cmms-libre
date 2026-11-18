import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ErrorBanner from './ErrorBanner'

const links = [
  { to: '/', label: 'Dashboard', gestion: false, soloAdmin: false },
  { to: '/activos', label: 'Activos', gestion: false, soloAdmin: false },
  { to: '/avisos', label: 'Avisos', gestion: false, soloAdmin: false },
  { to: '/ordenes', label: 'Órdenes de trabajo', gestion: false, soloAdmin: false },
  { to: '/preventivo', label: 'Planes preventivos', gestion: true, soloAdmin: false },
  { to: '/inventario', label: 'Inventario', gestion: false, soloAdmin: false },
  { to: '/bom', label: 'BOM / Repuestos', gestion: true, soloAdmin: false },
  { to: '/fallas', label: 'Catálogo de fallas', gestion: true, soloAdmin: false },
  { to: '/compras', label: 'Compras', gestion: true, soloAdmin: false },
  { to: '/produccion', label: 'Producción / OEE', gestion: true, soloAdmin: false },
  { to: '/reportes', label: 'Reportes', gestion: false, soloAdmin: false },
  { to: '/tecnicos', label: 'Técnicos', gestion: true, soloAdmin: false },
  { to: '/configuracion', label: 'Configuración', gestion: false, soloAdmin: true },
]

function IconoMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function IconoCerrar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function Layout() {
  const { logout, me, puedeGestionar, esAdministrador } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuAbierto(false)
  }, [location.pathname])

  const visibleLinks = links.filter(
    (link) => (!link.gestion || puedeGestionar) && (!link.soloAdmin || esAdministrador),
  )

  return (
    <div className="flex min-h-screen">
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-64 max-w-[85vw] shrink-0 bg-slate-900 text-slate-200 flex flex-col transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 flex items-center justify-between border-b border-slate-800">
          <span className="text-lg font-semibold text-white">CMMS Libre</span>
          <button
            onClick={() => setMenuAbierto(false)}
            className="md:hidden text-slate-300 hover:text-white"
            aria-label="Cerrar menú"
          >
            <IconoCerrar />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleLinks.map((link) => (
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-3 bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
          <button
            onClick={() => setMenuAbierto(true)}
            className="text-slate-700"
            aria-label="Abrir menú"
          >
            <IconoMenu />
          </button>
          <span className="font-semibold text-slate-800">CMMS Libre</span>
        </header>
        <ErrorBanner />
        <main className="flex-1 bg-gray-100 p-4 md:p-6 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
