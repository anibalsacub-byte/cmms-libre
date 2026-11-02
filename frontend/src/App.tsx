import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import Notices from './pages/Notices'
import WorkOrders from './pages/WorkOrders'
import Inventory from './pages/Inventory'
import Technicians from './pages/Technicians'
import Bom from './pages/Bom'
import FailureCatalog from './pages/FailureCatalog'
import Purchasing from './pages/Purchasing'
import Production from './pages/Production'
import PreventivePlans from './pages/PreventivePlans'
import Reports from './pages/Reports'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequierePasswordOk({ children }: { children: React.ReactNode }) {
  const { me } = useAuth()
  if (me?.debe_cambiar_password) return <Navigate to="/cambiar-password" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/cambiar-password"
        element={
          <PrivateRoute>
            <ChangePassword />
          </PrivateRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <RequierePasswordOk>
              <Layout />
            </RequierePasswordOk>
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="activos" element={<Assets />} />
        <Route path="avisos" element={<Notices />} />
        <Route path="ordenes" element={<WorkOrders />} />
        <Route path="inventario" element={<Inventory />} />
        <Route path="bom" element={<Bom />} />
        <Route path="fallas" element={<FailureCatalog />} />
        <Route path="compras" element={<Purchasing />} />
        <Route path="produccion" element={<Production />} />
        <Route path="preventivo" element={<PreventivePlans />} />
        <Route path="reportes" element={<Reports />} />
        <Route path="tecnicos" element={<Technicians />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
