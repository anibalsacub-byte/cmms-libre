import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/activos', label: 'Activos' },
  { to: '/avisos', label: 'Avisos' },
  { to: '/ordenes', label: 'Órdenes de trabajo' },
  { to: '/inventario', label: 'Inventario' },
  { to: '/tecnicos', label: 'Técnicos' },
]

export default function Layout() {
  const { logout } = useAuth()

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-200 flex flex-col">
        <div className="px-5 py-5 text-lg font-semibold text-white border-b border-slate-800">
          CMMS Libre
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((link) => (
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
        <div className="px-3 py-4 border-t border-slate-800">
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
