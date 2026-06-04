import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import ErrorBoundary from '@/components/ErrorBoundary'

const pageTitles: Record<string, string> = {
  '/':          'Dashboard',
  '/ventas':    'Ventas',
  '/productos': 'Productos',
  '/stock':     'Stock & Rotación',
  '/reportes':  'Reportes',
  '/config':    'Configuración',
}

export default function Layout() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] ?? 'Dashboard'

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={title} />
        <main className="flex-1 p-6 overflow-auto bg-gray-50">
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
