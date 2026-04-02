import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Ventas from '@/pages/Ventas'
import Productos from '@/pages/Productos'
import Stock from '@/pages/Stock'
import Reportes from '@/pages/Reportes'
import Config from '@/pages/Config'

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
