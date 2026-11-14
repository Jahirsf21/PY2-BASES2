import { z } from "zod";
import { emptyToUndefined, queryInteger, queryText } from "./common.js";

/** Sucursal de los reportes: san-jose, limon o ausente para el consolidado. */
const sucursal = z.preprocess(
  emptyToUndefined,
  z
    .enum(["san-jose", "limon"], {
      error:
        "La sucursal debe ser san-jose, limon o vacía para el consolidado.",
    })
    .optional(),
);

/** Año opcional de un filtro; el SP valida que exista en los documentos. */
const year = (label) => queryInteger(label, 1, 9999);

/** Filtros del resumen de compras por proveedor. */
export const supplierPurchaseSummaryQuery = z.object({
  supplierName: queryText("El nombre del proveedor", 100),
  supplierCategoryName: queryText("La categoría del proveedor", 50),
  sucursal,
});

/** Filtros del resumen de ventas por cliente. */
export const customerSalesSummaryQuery = z.object({
  customerName: queryText("El nombre del cliente", 100),
  customerCategoryName: queryText("La categoría del cliente", 50),
  sucursal,
});

/** Filtros del ranking anual de clientes. */
export const topCustomersByYearQuery = z.object({
  invoiceYearFrom: year("El año inicial"),
  invoiceYearTo: year("El año final"),
  sucursal,
});

/** Filtros del ranking anual de productos. */
export const topProductsByYearQuery = z.object({
  year: year("El año"),
  sucursal,
});

/** Filtros del ranking anual de proveedores. */
export const topSuppliersByYearQuery = z.object({
  orderYearFrom: year("El año inicial"),
  orderYearTo: year("El año final"),
  sucursal,
});

/** Filtros de la matriz de ventas por categoría y año. */
export const productCategorySalesByYearQuery = z.object({ sucursal });

/** Filtros de los seguimientos mensuales; el SP valida el contenido de stockGroupIDsJson. */
export const monthlyTrackingQuery = z.object({
  year: year("El año"),
  month: queryInteger("El mes", 1, 12),
  stockGroupIDsJson: queryText("La lista de categorías", 4000),
  sucursal,
});
