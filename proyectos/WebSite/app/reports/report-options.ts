/** Reportes disponibles en la vista de estadísticas y sus páginas de destino. */
export const reportOptions = {
  'customer-sales-summary': {
    title: 'Resumen de ventas por cliente',
    description: 'Montos máximo, mínimo y promedio de las facturas por cliente y categoría, con un resumen general.',
    group: 'Ventas',
  },
  'top-customers-by-year': {
    title: 'Ranking anual de clientes',
    description: 'Los cinco primeros puestos por cantidad de facturas de cada año.',
    group: 'Ventas',
  },
  'top-products-by-year': {
    title: 'Ranking anual de productos',
    description: 'Los cinco primeros puestos por ganancia acumulada de cada año, incluyendo empates.',
    group: 'Ventas',
  },
  'product-category-sales-by-year': {
    title: 'Ventas anuales por grupo de productos',
    description: 'Monto facturado por año con los grupos de productos como columnas.',
    group: 'Ventas',
  },
  'customer-sales-tracking': {
    title: 'Seguimiento mensual de ventas',
    description: 'Montos de primera y última factura y cantidades total, máxima y mínima por cliente, año y mes, con filtros por categorías de productos.',
    group: 'Ventas',
  },
  'supplier-purchase-summary': {
    title: 'Resumen de compras por proveedor',
    description: 'Montos máximo, mínimo y promedio de las órdenes de compra completas por proveedor y categoría, con un resumen general.',
    group: 'Compras',
  },
  'top-suppliers-by-year': {
    title: 'Ranking anual de proveedores',
    description: 'Los cinco primeros puestos por cantidad de órdenes de compra de cada año.',
    group: 'Compras',
  },
  'supplier-purchase-tracking': {
    title: 'Seguimiento mensual de compras',
    description: 'Montos de primera y última compra y cantidades total, máxima y mínima de empaques por proveedor, año y mes, con filtros por categorías de productos.',
    group: 'Compras',
  },
} as const
