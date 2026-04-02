import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  BarChart3,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/',          label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/ventas',    label: 'Ventas',         icon: ShoppingCart },
  { to: '/productos', label: 'Productos',      icon: Package },
  { to: '/stock',     label: 'Stock',          icon: Warehouse },
  { to: '/reportes',  label: 'Reportes',       icon: BarChart3 },
  { to: '/config',    label: 'Configuración',  icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          MP
        </div>
        <span className="font-semibold text-lg leading-tight">
          Motopartes
          <br />
          <span className="text-xs font-normal text-gray-400">Dashboard</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
