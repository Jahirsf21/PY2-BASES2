import { Router } from 'express'
import { listInvoices, getInvoiceById, getInvoiceEditById, getInvoiceLinesById, addInvoice, editInvoice } from '../controllers/salesController.js'

// Rutas de Ventas (facturas).
const router = Router()

/**
 * GET /sales
 * Devuelve una página de facturas (módulo de ventas) paginada.
 * Query params: pageNumber, pageSize, invoiceID, invoiceDateFrom, invoiceDateTo, customerName, deliveryMethodID, minInvoiceAmount, maxInvoiceAmount
 */
router.get('/sales', listInvoices)

/**
 * POST /sales
 * Crea una factura con sus líneas de detalle.
 * Body: datos requeridos por Sales.InsertInvoice.
 */
router.post('/sales', addInvoice)

/**
 * GET /sales/:invoiceID
 * Devuelve el encabezado de una factura.
 * Path param: invoiceID
 */
router.get('/sales/:invoiceID', getInvoiceById)

/**
 * GET /sales/:invoiceID/edit
 * Devuelve los datos editables del encabezado de una factura.
 * Path param: invoiceID
 */
router.get('/sales/:invoiceID/edit', getInvoiceEditById)

/**
 * GET /sales/:invoiceID/lines
 * Devuelve las líneas de detalle de una factura.
 * Path param: invoiceID
 */
router.get('/sales/:invoiceID/lines', getInvoiceLinesById)

/**
 * PUT /sales/:invoiceID
 * Actualiza el encabezado y las líneas de una factura.
 * Path param: invoiceID. Body: datos requeridos por Sales.UpdateInvoice.
 */
router.put('/sales/:invoiceID', editInvoice)

export default router
