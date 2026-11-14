import { Router } from "express";
import {
  listInvoices,
  getInvoiceById,
  getInvoiceEditById,
  getInvoiceLinesById,
  addInvoice,
  editInvoice,
} from "../controllers/salesController.js";
import { requireRole } from "../middleware/auth.js";
import { sqlErrors } from "../middleware/sqlErrors.js";
import {
  validateBody,
  validateParams,
  validatePagination,
  validateQuery,
} from "../middleware/validation.js";
import { idParams } from "../schemas/common.js";
import { invoiceSchema, invoicesQuery } from "../schemas/sales.js";

// Rutas de Ventas (facturas).
const router = Router();

/** La factura no tiene líneas válidas, al crearla o al actualizarla. */
const invalidLines = [400, "La factura debe tener al menos una línea válida"];

/**
 * GET /sales
 * Devuelve una página de facturas (módulo de ventas) paginada.
 * Query params: pageNumber, pageSize, invoiceID, invoiceDateFrom, invoiceDateTo, customerName, deliveryMethodID, minInvoiceAmount, maxInvoiceAmount
 */
router.get(
  "/sales",
  requireRole("Administrador"),
  validatePagination,
  validateQuery(invoicesQuery),
  listInvoices,
  sqlErrors({
    54004: [400, "La fecha inicial no puede ser mayor que la fecha final"],
    54005: [400, "Los montos no pueden ser negativos"],
    54006: [400, "El monto mínimo no puede ser mayor que el monto máximo"],
  }),
);

/**
 * POST /sales
 * Crea una factura con sus líneas de detalle.
 * Body: datos requeridos por Sales.InsertInvoice.
 */
router.post(
  "/sales",
  requireRole("Administrador"),
  validateBody(invoiceSchema),
  addInvoice,
  sqlErrors({ 54000: invalidLines }),
);

/**
 * GET /sales/:invoiceID
 * Devuelve el encabezado de una factura.
 * Path param: invoiceID
 */
router.get(
  "/sales/:invoiceID",
  requireRole("Administrador"),
  validateParams(idParams("invoiceID", "Factura")),
  getInvoiceById,
);

/**
 * GET /sales/:invoiceID/edit
 * Devuelve los datos editables del encabezado de una factura.
 * Path param: invoiceID
 */
router.get(
  "/sales/:invoiceID/edit",
  requireRole("Administrador"),
  validateParams(idParams("invoiceID", "Factura")),
  getInvoiceEditById,
);

/**
 * GET /sales/:invoiceID/lines
 * Devuelve las líneas de detalle de una factura.
 * Path param: invoiceID
 */
router.get(
  "/sales/:invoiceID/lines",
  requireRole("Administrador"),
  validateParams(idParams("invoiceID", "Factura")),
  getInvoiceLinesById,
);

/**
 * PUT /sales/:invoiceID
 * Actualiza el encabezado y las líneas de una factura.
 * Path param: invoiceID. Body: datos requeridos por Sales.UpdateInvoice.
 */
router.put(
  "/sales/:invoiceID",
  requireRole("Administrador"),
  validateParams(idParams("invoiceID", "Factura")),
  validateBody(invoiceSchema),
  editInvoice,
  sqlErrors({
    54001: [404, "Factura no encontrada"],
    54002: invalidLines,
  }),
);

export default router;
