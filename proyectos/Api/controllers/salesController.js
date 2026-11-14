import { paginatedResponse } from "../helpers/paginatedResponse.js";
import {
  getInvoices,
  getInvoiceHeader,
  getInvoiceForEdit,
  getInvoiceLines,
  insertInvoice,
  updateInvoice,
} from "../services/sales.js";

/**
 * Obtiene una página de facturas.
 * Permite filtrar opcionalmente por número de factura, rango de fechas, nombre de cliente, método de entrega y rango de monto.
 *
 * @param {import('express').Request} req Petición HTTP. Espera pageNumber, pageSize, invoiceID, invoiceDateFrom, invoiceDateTo, customerName, deliveryMethodID, minInvoiceAmount y maxInvoiceAmount en req.query.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con la página de facturas.
 */
export async function listInvoices(req, res, next) {
  try {
    const { pageNumber, pageSize } = res.locals.pagination;
    const result = await getInvoices(req.user, {
      invoiceID: req.query.invoiceID,
      invoiceDateFrom: req.query.invoiceDateFrom,
      invoiceDateTo: req.query.invoiceDateTo,
      customerName: req.query.customerName,
      deliveryMethodID: req.query.deliveryMethodID,
      minInvoiceAmount: req.query.minInvoiceAmount,
      maxInvoiceAmount: req.query.maxInvoiceAmount,
      pageNumber,
      pageSize,
    });
    return paginatedResponse(res, pageNumber, pageSize, result);
  } catch (error) {
    const sqlErrorCode = Number(error.number);
    if (sqlErrorCode === 54004) {
      return res.status(400).json({
        message: "La fecha inicial no puede ser mayor que la fecha final",
      });
    }
    if (sqlErrorCode === 54005) {
      return res
        .status(400)
        .json({ message: "Los montos no pueden ser negativos" });
    }
    if (sqlErrorCode === 54006) {
      return res.status(400).json({
        message: "El monto mínimo no puede ser mayor que el monto máximo",
      });
    }
    return next(error);
  }
}

/**
 * Obtiene el encabezado de una factura por su identificador.
 *
 * @param {import('express').Request} req Petición HTTP con invoiceID en res.locals.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Encabezado de la factura o 404.
 */
export async function getInvoiceById(req, res, next) {
  try {
    const { invoiceID } = res.locals.params;
    const invoice = await getInvoiceHeader(req.user, invoiceID);
    if (invoice.length === 0) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }
    return res.json(invoice);
  } catch (error) {
    return next(error);
  }
}

/**
 * Obtiene los datos editables de una factura.
 *
 * @param {import('express').Request} req Petición HTTP con invoiceID en res.locals.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Datos del formulario o 404.
 */
export async function getInvoiceEditById(req, res, next) {
  try {
    const { invoiceID } = res.locals.params;
    const invoice = await getInvoiceForEdit(req.user, invoiceID);
    if (invoice.length === 0) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }
    return res.json(invoice[0]);
  } catch (error) {
    return next(error);
  }
}

/**
 * Obtiene las líneas de detalle de una factura.
 *
 * @param {import('express').Request} req Petición HTTP con invoiceID en res.locals.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Líneas de la factura o 404.
 */
export async function getInvoiceLinesById(req, res, next) {
  try {
    const { invoiceID } = res.locals.params;
    const lines = await getInvoiceLines(req.user, invoiceID);
    if (lines.length === 0) {
      return res
        .status(404)
        .json({ message: "Líneas de la factura no encontradas" });
    }
    return res.json(lines);
  } catch (error) {
    return next(error);
  }
}

/**
 * Crea una factura con los datos del cuerpo de la solicitud.
 *
 * @param {import('express').Request} req Petición HTTP con los datos de la factura en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Identificador de la factura creada.
 */
export async function addInvoice(req, res, next) {
  const invoice = req.body;
  try {
    const invoiceID = await insertInvoice(req.user, invoice);
    return res.status(201).json({ invoiceID });
  } catch (error) {
    if (Number(error.number) === 54000) {
      return res
        .status(400)
        .json({ message: "La factura debe tener al menos una línea válida" });
    }
    return next(error);
  }
}

/**
 * Actualiza una factura y reemplaza sus líneas.
 *
 * @param {import('express').Request} req Petición HTTP con invoiceID en res.locals.params y datos en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Confirmación de la actualización.
 */
export async function editInvoice(req, res, next) {
  const { invoiceID } = res.locals.params;
  const invoice = req.body;
  try {
    await updateInvoice(req.user, invoiceID, invoice);
    return res.json({ invoiceID });
  } catch (error) {
    const sqlErrorCode = Number(error.number);
    if (sqlErrorCode === 54001) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }
    if (sqlErrorCode === 54002) {
      return res
        .status(400)
        .json({ message: "La factura debe tener al menos una línea válida" });
    }
    return next(error);
  }
}
