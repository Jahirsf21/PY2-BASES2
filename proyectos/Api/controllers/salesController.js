import { paginatedResponse } from '../helpers/paginatedResponse.js'
import { validateInvoice } from '../helpers/entityValidation.js'
import { getInvoices, getInvoiceHeader, getInvoiceForEdit, getInvoiceLines, insertInvoice, updateInvoice } from '../services/sales.js'

/**
 * Obtiene una página de facturas.
 * Permite filtrar opcionalmente por número de factura, rango de fechas, nombre de cliente, método de entrega y rango de monto.
 *
 * @param {import('express').Request} req Petición HTTP. Espera pageNumber, pageSize, invoiceID, invoiceDateFrom, invoiceDateTo, customerName, deliveryMethodID, minInvoiceAmount y maxInvoiceAmount en req.query.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con la página de facturas.
 */
export async function listInvoices(req, res) {
    try {
        const pageNumber = Number(req.query.pageNumber)
        const pageSize = Number(req.query.pageSize)
        if (!Number.isInteger(pageNumber) || !Number.isInteger(pageSize) || pageNumber < 1 || pageSize < 1) {
            return res.status(400).json({message: 'pageNumber y pageSize deben ser enteros mayores a 0'})
        }
        if (pageSize > 100) {
            return res.status(400).json({message: 'pageSize no puede ser mayor a 100'})
        }
        const invoiceID = req.query.invoiceID
        const invoiceDateFrom = req.query.invoiceDateFrom
        const invoiceDateTo = req.query.invoiceDateTo
        const customerName = req.query.customerName
        const deliveryMethodID = req.query.deliveryMethodID
        const minInvoiceAmount = req.query.minInvoiceAmount
        const maxInvoiceAmount = req.query.maxInvoiceAmount
        const result = await getInvoices(invoiceID, invoiceDateFrom, invoiceDateTo, customerName, deliveryMethodID, minInvoiceAmount, maxInvoiceAmount, pageNumber, pageSize)
        return paginatedResponse(res, pageNumber, pageSize, result)
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 54004) {
            return res.status(400).json({message: 'La fecha inicial no puede ser mayor que la fecha final.'})
        }
        if (sqlErrorCode === 54005) {
            return res.status(400).json({message: 'Los montos no pueden ser negativos.'})
        }
        if (sqlErrorCode === 54006) {
            return res.status(400).json({message: 'El monto mínimo no puede ser mayor que el monto máximo.'})
        }
        return res.status(500).json({message: 'Error al obtener facturas'})
    }
}

/**
 * Obtiene el encabezado de una factura por su identificador.
 *
 * @param {import('express').Request} req Petición HTTP con invoiceID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Encabezado de la factura o 404.
 */
export async function getInvoiceById(req, res) {
    try {
        const invoiceID = parseInt(req.params.invoiceID, 10)
        const invoice = await getInvoiceHeader(invoiceID)
        if (invoice.length === 0) {
            return res.status(404).json({message: 'Factura no encontrada'})
        }
        return res.json(invoice)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener la factura'})
    }
}

/**
 * Obtiene los datos editables de una factura.
 *
 * @param {import('express').Request} req Petición HTTP con invoiceID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Datos del formulario o 404.
 */
export async function getInvoiceEditById(req, res) {
    try {
        const invoiceID = parseInt(req.params.invoiceID, 10)
        const invoice = await getInvoiceForEdit(invoiceID)
        if (invoice.length === 0) {
            return res.status(404).json({message: 'Factura no encontrada'})
        }
        return res.json(invoice[0])
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener la factura para editar'})
    }
}

/**
 * Obtiene las líneas de detalle de una factura.
 *
 * @param {import('express').Request} req Petición HTTP con invoiceID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Líneas de la factura o 404.
 */
export async function getInvoiceLinesById(req, res) {
    try {
        const invoiceID = parseInt(req.params.invoiceID, 10)
        const lines = await getInvoiceLines(invoiceID)
        if (lines.length === 0) {
            return res.status(404).json({message: 'Líneas de la factura no encontradas'})
        }
        return res.json(lines)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener las líneas de la factura'})
    }
}

/**
 * Crea una factura con los datos del cuerpo de la solicitud.
 *
 * @param {import('express').Request} req Petición HTTP con los datos de la factura en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Identificador de la factura creada.
 */
export async function addInvoice(req, res) {
    const invoice = req.body
    if (!invoice || typeof invoice !== 'object' || Array.isArray(invoice)) {
        return res.status(400).json({message: 'Indique los datos de la factura'})
    }
    const {fields, errors} = validateInvoice(invoice)
    if (fields.length > 0) {
        return res.status(400).json({message: errors[fields[0]], fields, errors})
    }
    try {
        const invoiceID = await insertInvoice(invoice)
        return res.status(201).json({invoiceID})
    } catch (error) {
        if (Number(error.number) === 54000) {
            return res.status(400).json({message: 'La factura debe tener al menos una línea válida'})
        }
        return res.status(500).json({message: 'Error al crear la factura'})
    }
}

/**
 * Actualiza una factura y reemplaza sus líneas.
 *
 * @param {import('express').Request} req Petición HTTP con invoiceID en la ruta y datos en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Confirmación de la actualización.
 */
export async function editInvoice(req, res) {
    const invoiceID = Number(req.params.invoiceID)
    const invoice = req.body
    if (!invoice || typeof invoice !== 'object' || Array.isArray(invoice)) {
        return res.status(400).json({message: 'Indique los datos de la factura'})
    }
    const {fields, errors} = validateInvoice(invoice)
    if (fields.length > 0) {
        return res.status(400).json({message: errors[fields[0]], fields, errors})
    }
    try {
        await updateInvoice(invoiceID, invoice)
        return res.json({invoiceID})
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 54001) {
            return res.status(404).json({message: 'Factura no encontrada'})
        }
        if (sqlErrorCode === 54002) {
            return res.status(400).json({message: 'La factura debe tener al menos una línea válida'})
        }
        return res.status(500).json({message: 'Error al actualizar la factura'})
    }
}

