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
| `/` | `Dashboard.tsx` | KPIs del último día + gráfico diario (7/30/90d) + gráfico semanal (8/16/32s) + gráfico horario (7/30/90d) |
| `/ventas` | `Ventas.tsx` | KPIs + chart diario (7/30/90d) + analytics accionables: top productos, composición por rubro, distribución de tickets, ventas por día de semana, notas de crédito |
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

#### Zona horaria (importante)

La columna `facturas.fecha_registro` es un `timestamp` naive de Postgres: los valores están en **UTC** pero Supabase los devuelve como string sin sufijo (`"2025-08-22T23:55:54"`, sin `Z`). Si se parsea directo con `new Date(...)`, JavaScript lo interpreta como hora local del navegador y cualquier conversión posterior con `Intl.DateTimeFormat` queda anulada.

Patrón correcto para leer la hora local de Argentina (ART, UTC−3):

```ts
const raw = row.fecha_registro
const iso = raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}Z`
const d = new Date(iso)
// d ahora es un Date UTC correcto; formatear con timeZone: 'America/Argentina/Buenos_Aires'
```

Ver `src/hooks/useVentasHorarias.ts` como referencia. `fecha_factura` en cambio siempre trae `03:00:00` (medianoche ART en UTC) y solo representa la fecha del comprobante, no sirve para análisis horario.

#### Hooks disponibles

| Hook | Retorna | Uso |
|------|---------|-----|
| `useVentasDiarias(days)` | `{ ventasDiarias, baseline, today, loading, error }` | Dashboard, Ventas |
| `useVentasSemanales(weeks)` | `{ ventas, baseline, loading, error }` | Dashboard, Reportes |
| `useVentasHorarias(days)` | `{ data, loading, error }` — array de 24 horas con `cantidad`, `monto`, `promedioCantidad`, `promedioMonto` (agregado client-side por hora local ART desde `facturas.fecha_registro`) | Dashboard |
| `useFacturas({ limit, from, to })` | `{ facturas, loading, error }` | Ventas |
| `useProductos()` | `{ productos, loading, error }` | Productos, Stock, Ventas |
| `useDetalleVentas()` | `{ detalles, loading, error }` | Stock, Reportes, Ventas |

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

### Patrones de Dashboard

`Dashboard.tsx` usa componentes aislados para evitar re-renders innecesarios:

- **KPI cards** — usan `useVentasDiarias(30)` fijo, nunca cambian al interactuar con los gráficos.
- **`DailyChartCard`** — componente interno con su propio `useState<7|30|90>` y `useVentasDiarias(chartDays)`. Muestra área de ventas + línea de promedio 28d. Solo este componente re-renderiza al cambiar el período.
- **`WeeklyChartCard`** — componente interno con su propio `useState<8|16|32>` y `useVentasSemanales(weeks)`. Muestra barras de ventas + línea de baseline histórico (gris punteada) + línea de tendencia por regresión lineal (verde = alza, roja = baja). Solo este componente re-renderiza al cambiar el período.
- **`HourlyChartCard`** — componente interno con su propio `useState<7|30|90>` + toggle `cantidad|monto` y `useVentasHorarias(chartDays)`. Renderizado full-width debajo de la grilla de diario/semanal. `BarChart` de 24 horas con promedio por día, muestra pico y valle inline en la cabecera. La conversión a hora local ART (UTC-3) se hace en el hook con `Intl.DateTimeFormat` para ser robusta a la zona horaria del navegador.

Al agregar nuevos gráficos interactivos al Dashboard, seguir este mismo patrón: encapsular estado + hook + JSX en un componente propio.

### Patrones de Ventas

`Ventas.tsx` tiene un selector de período global (`useState<7|30|90>`) que controla todos los componentes analíticos. A diferencia del Dashboard (donde cada chart tiene su propio período independiente), acá todos comparten el mismo período y los datos se fetchean **una vez en el padre** para evitar llamadas duplicadas:

- `useVentasDiarias(period)` — para KPIs, gráfico diario y `VentasPorDiaCard`
- `useFacturas({ limit: 500, from })` — compartido entre `DistribucionTicketsCard` y `NotasCreditoCard`
- `useDetalleVentas()` — compartido entre `TopProductosCard` y `ComposicionRubroCard`
- `useProductos()` — para `ComposicionRubroCard`

Los datos se pasan como props a cada componente interno. Cada componente incluye un `<p className="text-xs text-gray-400">` debajo del título explicando para qué sirve y cómo usarlo.

**Componentes internos de Ventas.tsx:**
- **`TopProductosCard`** — top 10 productos por ingresos en el período, con margen% color-coded (verde ≥20%, amber <20%)
- **`ComposicionRubroCard`** — gráfico horizontal con participación % de cada rubro en el período
- **`DistribucionTicketsCard`** — histograma de `total_factura` en 5 rangos ($5k, $15k, $50k, $100k)
- **`VentasPorDiaCard`** — promedio de ventas por día de la semana (Lun-Dom) usando `parseISO(fecha).getDay()`
- **`NotasCreditoCard`** — indicador compacto: cantidad NC, monto NC, ratio % sobre facturado (verde <5%, amber 5-10%, rojo >10%)
