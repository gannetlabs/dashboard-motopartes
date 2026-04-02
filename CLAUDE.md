# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, http://localhost:5173)
npm run build     # Type-check + production build
npm run preview   # Preview production build
npm run lint      # ESLint check
npx tsc --noEmit  # Type-check only
```

## Environment Setup

The `.env` file is already configured with the real Supabase credentials:

```
VITE_SUPABASE_URL=https://motosursupabase.motopartesur.com
VITE_SUPABASE_ANON_KEY=<anon key already set>
```

## Architecture

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + React Router v6 + Recharts + Supabase JS

### Routing

`App.tsx` defines all routes nested under a single `<Layout>` route. Pages live in `src/pages/`. Adding a new page requires: creating the page component, adding a `<Route>` in `App.tsx`, a nav entry in `src/components/layout/Sidebar.tsx`, and a title in the `pageTitles` map in `src/components/layout/Layout.tsx`.

Current routes:
| Path | Page | Description |
|------|------|-------------|
| `/` | `Dashboard.tsx` | KPIs del último día + gráficos diarios y semanales |
| `/ventas` | `Ventas.tsx` | Facturas con filtro de período + chart diario |
| `/productos` | `Productos.tsx` | Catálogo con filtro por rubro y búsqueda |
| `/stock` | `Stock.tsx` | Rotación de productos: velocidad de venta y sin movimiento |
| `/reportes` | `Reportes.tsx` | Margen bruto por rubro y top productos |
| `/config` | `Config.tsx` | Configuración (placeholder) |

### Supabase

The client is a singleton exported from `src/lib/supabase.ts`. All database queries go through custom hooks in `src/hooks/`. Never query Supabase directly from page components.

#### Tablas disponibles

| Tabla | Descripción | Filas aprox. |
|-------|-------------|--------------|
| `facturas` | Comprobantes de venta (ago 2025 → actual) | ~3.000 |
| `detalle_factura` | Ítems por factura: precio, costo, cantidad | ~4.400 |
| `productos` | Catálogo con rubro, marca, proveedor | ~1.600 |
| `ventas_diarias` | Agregados diarios pre-calculados | ~186 |
| `mv_ventas_semanales` | Agregados semanales (materialized view) | ~33 |
| `mv_baseline_ventas_diarias` | Promedio móvil 28d por día | ~185 |
| `mv_baseline_ventas_semanales` | Baseline histórico semanal | ~32 |
| `empleados` | Empleados/vendedores (no usar en dashboard) | — |
| `clientes` | Clientes (no usar en dashboard) | — |
| `whatsapp_messages` | Mensajes WA (no usar en dashboard) | — |

**Nota:** `pagos` está vacía. `tenants` es interna de Supabase Realtime, no contiene datos del negocio.

#### Hooks disponibles

| Hook | Retorna | Uso |
|------|---------|-----|
| `useVentasDiarias(days)` | `{ ventasDiarias, baseline, today, loading, error }` | Dashboard, Ventas |
| `useVentasSemanales(weeks)` | `{ ventas, baseline, loading, error }` | Dashboard, Reportes |
| `useFacturas({ limit, from, to })` | `{ facturas, loading, error }` | Ventas |
| `useProductos()` | `{ productos, loading, error }` | Productos, Stock |
| `useDetalleVentas()` | `{ detalles, loading, error }` | Stock, Reportes |

`useDetalleVentas` también exporta `computeProductoStats(detalles, days?)` que agrega los detalles por `cod_item` y devuelve `ProductoStats[]` ordenados por ingresos descendente.

### Types

`src/types/index.ts` contiene interfaces que mapean exactamente con las tablas reales de Supabase: `Factura`, `DetalleFactura`, `Producto`, `VentaDiaria`, `BaselineVentaDiaria`, `VentaSemanal`, `BaselineVentaSemanal`.

### Utilities

- `cn()` en `src/lib/utils.ts` — merges Tailwind classes (clsx + tailwind-merge)
- `formatCurrency()` — formatea a ARS (Peso Argentino)
- `formatNumber()` — formateo de números con locale argentino

### Styling

Tailwind con escala de color `primary` (tonos naranja, definida en `tailwind.config.js`). El sidebar usa `bg-gray-900`; el área de contenido usa `bg-gray-50`. Los nav links activos usan `bg-primary-600`.

### Componentes UI

- `src/components/ui/KpiCard.tsx` — tarjeta de métrica con ícono, valor, subtítulo y tendencia opcional. Props: `title`, `value`, `subtitle`, `icon`, `trend` (número, muestra % con color verde/rojo), `trendLabel` (texto junto al %, default: "vs promedio 28d").
