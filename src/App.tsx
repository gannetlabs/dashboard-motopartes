import { lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'

// Lazy-loaded so each page (and its heavy deps like Recharts) becomes its own
// chunk, loaded on demand instead of bloating the initial bundle.
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Ventas = lazy(() => import('@/pages/Ventas'))
const Productos = lazy(() => import('@/pages/Productos'))
const Stock = lazy(() => import('@/pages/Stock'))
const Reportes = lazy(() => import('@/pages/Reportes'))
const Config = lazy(() => import('@/pages/Config'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="ventas"    element={<Ventas />} />
          <Route path="productos" element={<Productos />} />
          <Route path="stock"     element={<Stock />} />
          <Route path="reportes"  element={<Reportes />} />
          <Route path="config"    element={<Config />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
