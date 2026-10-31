import type { PaginatedResponse } from './paginatedResponse'

/** Año disponible para filtrar los reportes de compras o ventas. */
export interface ReportYear {
  Año: number
}

/** Procedencia de los años mostrados en los filtros de los reportes. */
export type ReportYearSource = 'invoices' | 'purchases'

/** Montos incluidos en los resúmenes de compras y ventas. */
export interface AmountSummary {
  MontoMaximo: number | null
  MontoMinimo: number | null
  MontoPromedio: number | null
}

/** Resumen de montos de las órdenes de compra completas por proveedor y categoría. */
export interface SupplierPurchaseSummary extends AmountSummary {
  NombreProveedor: string
  NombreCategoriaProveedor: string
}

/** Resumen de montos facturados por cliente y categoría. */
export interface CustomerSalesSummary extends AmountSummary {
  NombreCliente: string
  NombreCategoriaCliente: string
}

/** Cliente incluido en los primeros cinco puestos del ranking anual. */
export interface TopCustomerByYear {
  Año: number
  NombreCliente: string
  CantidadFacturas: number
  MontoFacturado: number
  Ranking: number
}

/** Producto incluido en los primeros cinco puestos por ganancia acumulada del año. */
export interface TopProductByYear {
  Año: number
  NombreProducto: string
  Ganancia: number
  Ranking: number | string
}

/** Proveedor incluido en los primeros cinco puestos del ranking anual. */
export interface TopSupplierByYear {
  Año: number
  NombreProveedor: string
  CantidadCompras: number
  MontoComprado: number
  Ranking: number
}

/** Montos anuales con una columna por grupo de productos. */
export interface ProductCategorySalesByYear {
  Año: number
  'Novelty Items': number | null
  Clothing: number | null
  Mugs: number | null
  'T-Shirts': number | null
  'Airline Novelties': number | null
  'Computing Novelties': number | null
  'USB Novelties': number | null
  'Furry Footwear': number | null
  Toys: number | null
  'Packaging Materials': number | null
}

/** Cantidades y montos de primera y última factura de un cliente por año y mes. */
export interface CustomerSalesTracking {
  NombreCliente: string
  Año: number
  Mes: number
  Categorias: string | null
  MontoPrimeraFactura: number
  MontoUltimaFactura: number
  CantidadTotalMes: number
  CantidadMaxima: number
  CantidadMinima: number
}

/** Seguimiento de compras por proveedor, año y mes, con cantidades expresadas en empaques. */
export interface SupplierPurchaseTracking {
  NombreProveedor: string
  Año: number
  Mes: number
  Categorias: string | null
  MontoPrimeraCompra: number
  MontoUltimaCompra: number
  CantidadTotalMes: number
  CantidadMaxima: number
  CantidadMinima: number
}

/** Filtros del resumen de compras por proveedor. */
export interface SupplierPurchaseSummaryFilters {
  supplierName: string
  supplierCategoryName: string
}

/** Filtros del resumen de ventas por cliente. */
export interface CustomerSalesSummaryFilters {
  customerName: string
  customerCategoryName: string
}

/** Rango de años seleccionado para los rankings anuales. */
export interface YearRangeFilters {
  yearFrom: number | null
  yearTo: number | null
}

/** Año seleccionado para los reportes con un único filtro anual. */
export interface YearFilters {
  year: number | null
}

/** Filtros de los reportes de seguimiento mensual. */
export interface MonthlyTrackingFilters {
  year: number | null
  month: number | null
  stockGroupIDs: number[]
}

/** Respuestas paginadas de los reportes. */
export type CustomerSalesSummaryResponse = PaginatedResponse<CustomerSalesSummary>
export type CustomerSalesTrackingResponse = PaginatedResponse<CustomerSalesTracking>
export type SupplierPurchaseTrackingResponse = PaginatedResponse<SupplierPurchaseTracking>
