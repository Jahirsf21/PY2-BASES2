import { Router } from 'express'
import { listInvoices, getInvoiceById, getInvoiceEditById, getInvoiceLinesById, addInvoice, editInvoice } from '../controllers/salesController.js'
import { requireRole } from '../middleware/auth.js'
import { validateBody, validatePagination } from '../middleware/validation.js'
import { invoiceSchema } from '../schemas/sales.js'

// Rutas de Ventas (facturas).
const router = Router()

/**
 * GET /sales
 * Devuelve una página de facturas (módulo de ventas) paginada.
 * Query params: pageNumber, pageSize, invoiceID, invoiceDateFrom, invoiceDateTo, customerName, deliveryMethodID, minInvoiceAmount, maxInvoiceAmount
 */
router.get('/sales', requireRole('Administrador'), validatePagination, listInvoices)

/**
 * POST /sales
 * Crea una factura con sus líneas de detalle.
 * Body: datos requeridos por Sales.InsertInvoice.
 */
router.post('/sales', requireRole('Administrador'), validateBody(invoiceSchema), addInvoice)

/**
 * GET /sales/:invoiceID
 * Devuelve el encabezado de una factura.
 * Path param: invoiceID
 */
router.get('/sales/:invoiceID', requireRole('Administrador'), getInvoiceById)

/**
 * GET /sales/:invoiceID/edit
 * Devuelve los datos editables del encabezado de una factura.
 * Path param: invoiceID
 */
router.get('/sales/:invoiceID/edit', requireRole('Administrador'), getInvoiceEditById)

/**
 * GET /sales/:invoiceID/lines
 * Devuelve las líneas de detalle de una factura.
 * Path param: invoiceID
 */
router.get('/sales/:invoiceID/lines', requireRole('Administrador'), getInvoiceLinesById)

/**
 * PUT /sales/:invoiceID
 * Actualiza el encabezado y las líneas de una factura.
 * Path param: invoiceID. Body: datos requeridos por Sales.UpdateInvoice.
 */
router.put('/sales/:invoiceID', requireRole('Administrador'), validateBody(invoiceSchema), editInvoice)

export default router
