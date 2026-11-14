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
 * @param {import('express').Request} req Petición HTTP. Los filtros validados llegan en res.locals.query y la paginación en res.locals.pagination.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con la página de facturas.
 */
export async function listInvoices(req, res) {
  const { pageNumber, pageSize } = res.locals.pagination;
  const result = await getInvoices(req.user, {
    ...res.locals.query,
    pageNumber,
    pageSize,
  });
  return paginatedResponse(res, pageNumber, pageSize, result);
}

/**
 * Obtiene el encabezado de una factura por su identificador.
 *
 * @param {import('express').Request} req Petición HTTP con invoiceID en res.locals.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Encabezado de la factura o 404.
 */
export async function getInvoiceById(req, res) {
  const { invoiceID } = res.locals.params;
  const invoice = await getInvoiceHeader(req.user, invoiceID);
  if (invoice.length === 0) {
    return res.status(404).json({ message: "Factura no encontrada" });
  }
  return res.json(invoice);
}

/**
 * Obtiene los datos editables de una factura.
 *
 * @param {import('express').Request} req Petición HTTP con invoiceID en res.locals.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Datos del formulario o 404.
 */
export async function getInvoiceEditById(req, res) {
  const { invoiceID } = res.locals.params;
  const invoice = await getInvoiceForEdit(req.user, invoiceID);
  if (invoice.length === 0) {
    return res.status(404).json({ message: "Factura no encontrada" });
  }
  return res.json(invoice[0]);
}

/**
 * Obtiene las líneas de detalle de una factura.
 *
 * @param {import('express').Request} req Petición HTTP con invoiceID en res.locals.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Líneas de la factura o 404.
 */
export async function getInvoiceLinesById(req, res) {
  const { invoiceID } = res.locals.params;
  const lines = await getInvoiceLines(req.user, invoiceID);
  if (lines.length === 0) {
    return res
      .status(404)
      .json({ message: "Líneas de la factura no encontradas" });
  }
  return res.json(lines);
}

/**
 * Crea una factura con los datos del cuerpo de la solicitud.
 *
 * @param {import('express').Request} req Petición HTTP con los datos de la factura en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Identificador de la factura creada.
 */
export async function addInvoice(req, res) {
  const invoice = req.body;
  const invoiceID = await insertInvoice(req.user, invoice);
  return res.status(201).json({ invoiceID });
}

/**
 * Actualiza una factura y reemplaza sus líneas.
 *
 * @param {import('express').Request} req Petición HTTP con invoiceID en res.locals.params y datos en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Confirmación de la actualización.
 */
export async function editInvoice(req, res) {
  const { invoiceID } = res.locals.params;
  const invoice = req.body;
  await updateInvoice(req.user, invoiceID, invoice);
  return res.json({ invoiceID });
}
