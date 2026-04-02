export interface Factura {
  id_factura: number
  id_empresa: number
  punto_venta: string
  tipo_comprobante: string
  letra_comprobante: string
  nro_comprobante: number
  fecha_factura: string
  id_cliente: number
  id_empleado: number
  id_vendedor: number
  monto_gravado: number
  monto_iva: number
  monto_exento: number
  monto_descuento: number
  monto_percep_impuesto: number
  total_factura: number
  anulada: boolean
  fecha_registro: string
  nro_cae: string | null
  venc_cae: string | null
  nro_pedido: string | null
}

export interface DetalleFactura {
  id_detalle: number
  id_factura: number
  cod_item: string
  descripcion_item: string
  cantidad: number
  precio_unitario: number
  porc_iva: number
  porc_descuento: number
  costo_unitario: number
  moneda: string
  cotizacion_moneda: number
  cotizacion_dolar: number
  id_lista_precio: number | null
}

export interface Producto {
  cod_item: string
  nombre: string
  nombre_norm: string
  habilitado: boolean
  marca_codigo: string | null
  marca_nombre: string | null
  rubro_id: number | null
  rubro_nombre: string | null
  subrubro_id: number | null
  subrubro_nombre: string | null
  proveedor_id: number | null
  proveedor_nombre: string | null
  imagen_url: string | null
  codigo_externo: string | null
  last_sync_at: string
  created_at: string
  updated_at: string
}

export interface VentaDiaria {
  id: number
  id_empresa: number
  fecha: string
  ventas_brutas: number
  ventas_netas: number
  cantidad_comprobantes: number
  cantidad_items: number
  ticket_promedio: number
  creado_en: string
  actualizado_en: string
}

export interface BaselineVentaDiaria {
  id_empresa: number
  fecha: string
  dia_semana: number
  ventas_dia: number
  promedio_28d: number
  mediana_28d: number
  promedio_dia_semana: number
  dias_observados: number
}

export interface VentaSemanal {
  id_empresa: number
  semana_inicio: string
  semana_fin: string
  ventas_brutas: number
  ventas_netas: number
  comprobantes: number
  items: number
  ticket_promedio: number
}

export interface BaselineVentaSemanal {
  id_empresa: number
  semana_inicio: string
  ventas_semana: number
  promedio_8s: number
  mediana_8s: number
  semanas_observadas: number
}
