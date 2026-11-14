import { z } from "zod";

/**
 * Trata un filtro vacío de la URL como ausente.
 *
 * @param {unknown} value Valor recibido en req.query.
 * @returns {unknown} undefined si es texto vacío o solo espacios; en otro caso, el mismo valor.
 */
function emptyToUndefined(value) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

/**
 * Crea el esquema de un filtro de texto opcional con longitud máxima.
 *
 * @param {string} label Nombre legible del filtro para el mensaje.
 * @param {number} maxLength Longitud máxima permitida.
 * @returns {import('zod').ZodType<string|undefined>} Esquema del filtro, sin espacios en los extremos.
 */
function queryText(label, maxLength) {
  const message = `${label} debe ser texto de máximo ${maxLength} caracteres.`;
  return z.preprocess(
    emptyToUndefined,
    z
      .string({ error: message })
      .trim()
      .max(maxLength, { error: message })
      .optional(),
  );
}

/**
 * Crea el esquema de un filtro entero opcional dentro de un rango.
 *
 * @param {string} label Nombre legible del filtro para el mensaje.
 * @param {number} min Valor mínimo permitido.
 * @param {number} max Valor máximo permitido.
 * @returns {import('zod').ZodType<number|undefined>} Esquema que convierte el texto de la URL a número.
 */
function queryInteger(label, min, max) {
  const message = `${label} debe ser un número entero entre ${min} y ${max}.`;
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: message })
      .int({ error: message })
      .min(min, { error: message })
      .max(max, { error: message })
      .optional(),
  );
}

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

/** Filtros del resumen de ventas por cliente; la paginación se valida aparte. */
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
