import {
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  HandCoins,
  LayoutDashboard,
  PackageSearch,
  ReceiptText,
  Settings,
} from 'lucide-react'

export const navigation = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Ventas', path: '/ventas', icon: CircleDollarSign },
  { label: 'Gastos', path: '/gastos', icon: ReceiptText },
  { label: 'Productos', path: '/productos', icon: PackageSearch },
  { label: 'Socios', path: '/socios', icon: HandCoins },
  { label: 'Historial', path: '/historial', icon: ClipboardList },
  { label: 'Reportes', path: '/reportes', icon: ChartNoAxesCombined },
  { label: 'Configuración', path: '/configuracion', icon: Settings },
] as const
