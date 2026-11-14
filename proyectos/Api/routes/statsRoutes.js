import { Router } from "express";
import {
  listPurchaseYears,
  listInvoiceYears,
  listSupplierPurchaseSummary,
  listCustomerSalesSummary,
  listTopCustomersByYear,
  listTopProductsByYear,
  listTopSuppliersByYear,
  listProductCategorySalesByYear,
  listCustomerSalesTracking,
  listSupplierPurchaseTracking,
} from "../controllers/statsController.js";
import { requireRole } from "../middleware/auth.js";
import { sqlErrors } from "../middleware/sqlErrors.js";
import { validatePagination, validateQuery } from "../middleware/validation.js";
import {
  customerSalesSummaryQuery,
  monthlyTrackingQuery,
  productCategorySalesByYearQuery,
  supplierPurchaseSummaryQuery,
  topCustomersByYearQuery,
  topProductsByYearQuery,
  topSuppliersByYearQuery,
} from "../schemas/stats.js";

// Rutas de Estadísticas (compras y ventas). Los reportes admiten ?sucursal=san-jose|limon; sin ella son consolidados.
const router = Router();

/** Errores de la sucursal, compartidos por los ocho reportes. */
const sucursalErrors = {
  50006: [400, "La sucursal indicada no es válida"],
};

/** Errores de los reportes con rango de años. */
const yearRangeErrors = sqlErrors({
  50001: [400, "El año inicial indicado no existe en la base de datos"],
  50002: [400, "El año final indicado no existe en la base de datos"],
  50003: [400, "El año inicial no puede ser mayor que el año final"],
  ...sucursalErrors,
});

/** Errores de los seguimientos mensuales. */
const trackingErrors = sqlErrors({
  50001: [400, "El año indicado no existe en la base de datos"],
  50002: [400, "El mes debe estar entre 1 y 12"],
  50003: [
    400,
    "StockGroupIDsJson debe ser un arreglo JSON de IDs de categorías",
  ],
  50004: [400, "Los IDs de categorías deben ser números enteros positivos"],
  50005: [400, "Una o más categorías indicadas no existen en la base de datos"],
  ...sucursalErrors,
});

/**
 * GET /stats/purchase-years
 * Devuelve los años disponibles para los filtros de los reportes de compras.
 */
router.get(
  "/stats/purchase-years",
  requireRole("Corporativo"),
  listPurchaseYears,
);

/**
 * GET /stats/invoice-years
 * Devuelve los años disponibles para los filtros de los reportes de ventas.
 */
router.get(
  "/stats/invoice-years",
  requireRole("Corporativo"),
  listInvoiceYears,
);

/**
 * GET /stats/supplier-purchase-summary
 * Query params: supplierName, supplierCategoryName, sucursal (opcionales).
 */
router.get(
  "/stats/supplier-purchase-summary",
  requireRole("Corporativo"),
  validateQuery(supplierPurchaseSummaryQuery),
  listSupplierPurchaseSummary,
  sqlErrors(sucursalErrors),
);

/**
 * GET /stats/customer-sales-summary
 * Query params: pageNumber, pageSize; customerName, customerCategoryName, sucursal (opcionales).
 */
router.get(
  "/stats/customer-sales-summary",
  requireRole("Corporativo"),
  validatePagination,
  validateQuery(customerSalesSummaryQuery),
  listCustomerSalesSummary,
  sqlErrors(sucursalErrors),
);

/**
 * GET /stats/top-customers-by-year
 * Query params: invoiceYearFrom, invoiceYearTo, sucursal (opcionales).
 */
router.get(
  "/stats/top-customers-by-year",
  requireRole("Corporativo"),
  validateQuery(topCustomersByYearQuery),
  listTopCustomersByYear,
  yearRangeErrors,
);

/**
 * GET /stats/top-products-by-year
 * Query params: year, sucursal (opcionales).
 */
router.get(
  "/stats/top-products-by-year",
  requireRole("Corporativo"),
  validateQuery(topProductsByYearQuery),
  listTopProductsByYear,
  sqlErrors({
    50001: [400, "El año indicado no existe en la base de datos"],
    ...sucursalErrors,
  }),
);

/**
 * GET /stats/top-suppliers-by-year
 * Query params: orderYearFrom, orderYearTo, sucursal (opcionales).
 */
router.get(
  "/stats/top-suppliers-by-year",
  requireRole("Corporativo"),
  validateQuery(topSuppliersByYearQuery),
  listTopSuppliersByYear,
  yearRangeErrors,
);

/**
 * GET /stats/product-category-sales-by-year
 * Query params: sucursal (opcional).
 */
router.get(
  "/stats/product-category-sales-by-year",
  requireRole("Corporativo"),
  validateQuery(productCategorySalesByYearQuery),
  listProductCategorySalesByYear,
  sqlErrors(sucursalErrors),
);

/**
 * GET /stats/customer-sales-tracking
 * Query params: pageNumber, pageSize; year, month, stockGroupIDsJson, sucursal (opcionales).
 */
router.get(
  "/stats/customer-sales-tracking",
  requireRole("Corporativo"),
  validatePagination,
  validateQuery(monthlyTrackingQuery),
  listCustomerSalesTracking,
  trackingErrors,
);

/**
 * GET /stats/supplier-purchase-tracking
 * Query params: pageNumber, pageSize; year, month, stockGroupIDsJson, sucursal (opcionales).
 */
router.get(
  "/stats/supplier-purchase-tracking",
  requireRole("Corporativo"),
  validatePagination,
  validateQuery(monthlyTrackingQuery),
  listSupplierPurchaseTracking,
  trackingErrors,
);

export default router;
