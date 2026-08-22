import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { WorkspaceGate } from '../components/layout/WorkspaceGate'

const LoginPage = lazy(() => import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const DashboardPage = lazy(() => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const SalesPage = lazy(() => import('../pages/SalesPage').then((module) => ({ default: module.SalesPage })))
const ExpensesPage = lazy(() => import('../pages/ExpensesPage').then((module) => ({ default: module.ExpensesPage })))
const PartnersPage = lazy(() => import('../pages/PartnersPage').then((module) => ({ default: module.PartnersPage })))
const ProductsPage = lazy(() => import('../pages/ProductsPage').then((module) => ({ default: module.ProductsPage })))
const HistoryPage = lazy(() => import('../pages/HistoryPage').then((module) => ({ default: module.HistoryPage })))
const ReportsPage = lazy(() => import('../pages/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const SettingsPage = lazy(() => import('../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))

export function App() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-kova-50 text-sm font-semibold text-stone-400">Cargando KOVA…</div>}><Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<WorkspaceGate />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="ventas" element={<SalesPage />} />
            <Route path="gastos" element={<ExpensesPage />} />
            <Route path="productos" element={<ProductsPage />} />
            <Route path="socios" element={<PartnersPage />} />
            <Route path="historial" element={<HistoryPage />} />
            <Route path="reportes" element={<ReportsPage />} />
            <Route path="configuracion" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Suspense>
  )
}
