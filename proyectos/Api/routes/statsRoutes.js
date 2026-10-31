import { Router } from 'express'
import { listPurchaseYears, listInvoiceYears, listSupplierPurchaseSummary, listCustomerSalesSummary, listTopCustomersByYear, listTopProductsByYear, listTopSuppliersByYear, listProductCategorySalesByYear, listCustomerSalesTracking, listSupplierPurchaseTracking } from '../controllers/statsController.js'

// Rutas de Estadísticas (compras y ventas).
const router = Router()

/**
 * GET /stats/purchase-years
 * Devuelve los años disponibles para los filtros de los reportes de compras.
 */
router.get('/stats/purchase-years', listPurchaseYears)

/**
 * GET /stats/invoice-years
 * Devuelve los años disponibles para los filtros de los reportes de ventas.
 */
router.get('/stats/invoice-years', listInvoiceYears)

/**
 * GET /stats/supplier-purchase-summary
 * Devuelve el resumen de montos de órdenes de compra por proveedor y categoría, con un resumen general.
 * Query params: supplierName, supplierCategoryName
 * supplierCategoryName: nombre parcial de categoría; ausente o vacío para consultar todas.
 */
router.get('/stats/supplier-purchase-summary', listSupplierPurchaseSummary)

/**
 * GET /stats/customer-sales-summary
 * Devuelve una página del resumen de montos de ventas por cliente y categoría.
 * Query params: customerName, customerCategoryName, pageNumber, pageSize
 * customerCategoryName: nombre parcial de categoría; ausente o vacío para consultar todas.
 */
router.get('/stats/customer-sales-summary', listCustomerSalesSummary)

/**
 * GET /stats/top-customers-by-year
 * Devuelve los clientes con los cinco primeros puestos por cantidad de facturas por año, incluyendo empates.
 * Query params: invoiceYearFrom, invoiceYearTo
 */
router.get('/stats/top-customers-by-year', listTopCustomersByYear)

/**
 * GET /stats/top-products-by-year
 * Devuelve los productos con los cinco primeros puestos por ganancia acumulada de cada año, incluyendo empates.
 * Query params: year
 */
router.get('/stats/top-products-by-year', listTopProductsByYear)

/**
 * GET /stats/top-suppliers-by-year
 * Devuelve los proveedores con los cinco primeros puestos por cantidad de compras por año, incluyendo empates.
 * Query params: orderYearFrom, orderYearTo
 */
router.get('/stats/top-suppliers-by-year', listTopSuppliersByYear)

/**
 * GET /stats/product-category-sales-by-year
 * Devuelve el monto facturado por año con los grupos de productos como columnas.
 */
router.get('/stats/product-category-sales-by-year', listProductCategorySalesByYear)

/**
 * GET /stats/customer-sales-tracking
 * Devuelve una página del seguimiento mensual de ventas por cliente, con categorías de productos.
 * Query params: year, month, stockGroupIDsJson, pageNumber, pageSize
 * stockGroupIDsJson: arreglo JSON de IDs de categorías, como '[1,3,5]'; ausente o '[]' para consultar todas.
 */
router.get('/stats/customer-sales-tracking', listCustomerSalesTracking)

/**
 * GET /stats/supplier-purchase-tracking
 * Devuelve el seguimiento mensual paginado de compras por proveedor, con categorías de productos.
 * Query params enviados al procedimiento: year, month, stockGroupIDsJson, pageNumber, pageSize
 * stockGroupIDsJson: arreglo JSON de IDs de categorías, como '[1,3,5]'; ausente o '[]' para consultar todas.
 */
router.get('/stats/supplier-purchase-tracking', listSupplierPurchaseTracking)

export default router
