import sql from "mssql";
import { executeProcedure } from "../helpers/procedure.js";

/**
 * Parámetros del encabezado y las líneas, compartidos por insertar y actualizar una factura.
 *
 * @param {object} invoice Encabezado y líneas validados; lastEditedBy es un PersonID distinto de userID.
 * @returns {object} Parámetros como { Nombre: [tipo, valor] }.
 */
function invoiceParameters(invoice) {
  return {
    CustomerID: [sql.Int, invoice.customerID],
    BillToCustomerID: [sql.Int, invoice.billToCustomerID ?? null],
    DeliveryMethodID: [sql.Int, invoice.deliveryMethodID],
    ContactPersonID: [sql.Int, invoice.contactPersonID],
    AccountsPersonID: [sql.Int, invoice.accountsPersonID],
    PackedByPersonID: [sql.Int, invoice.packedByPersonID],
    LastEditedBy: [sql.Int, invoice.lastEditedBy],
    SalespersonPersonID: [sql.Int, invoice.salespersonPersonID ?? null],
    CustomerPurchaseOrderNumber: [
      sql.NVarChar,
      invoice.customerPurchaseOrderNumber ?? null,
    ],
    InvoiceDate: [sql.Date, invoice.invoiceDate],
    DeliveryInstructions: [sql.NVarChar, invoice.deliveryInstructions ?? null],
    LinesJson: [
      sql.NVarChar(sql.MAX),
      JSON.stringify(
        invoice.lines.map((line) => ({
          StockItemID: line.stockItemID,
          Quantity: line.quantity,
          UnitPrice: line.unitPrice,
        })),
      ),
    ],
  };
}

/**
 * Obtiene una página de facturas junto con el total de registros.
 * Permite filtrar opcionalmente por número de factura, rango de fechas, nombre de cliente,
 * método de entrega y rango de monto facturado.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {object} filters invoiceID, invoiceDateFrom, invoiceDateTo (YYYY-MM-DD), customerName, deliveryMethodID,
 *   minInvoiceAmount y maxInvoiceAmount opcionales, con pageNumber y pageSize.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de registros y facturas de la página.
 */
export async function getInvoices(session, filters) {
  const result = await executeProcedure(
    session,
    "Sales.GetInvoices",
    {
      InvoiceID: [sql.Int, filters.invoiceID],
      InvoiceDateFrom: [sql.Date, filters.invoiceDateFrom],
      InvoiceDateTo: [sql.Date, filters.invoiceDateTo],
      CustomerName: [sql.NVarChar, filters.customerName],
      DeliveryMethodID: [sql.Int, filters.deliveryMethodID],
      MinInvoiceAmount: [sql.Decimal(18, 2), filters.minInvoiceAmount],
      MaxInvoiceAmount: [sql.Decimal(18, 2), filters.maxInvoiceAmount],
      PageNumber: [sql.Int, filters.pageNumber],
      PageSize: [sql.Int, filters.pageSize],
    },
    { TotalCount: sql.Int },
  );
  return { totalCount: result.output.TotalCount, data: result.recordset };
}

/**
 * Obtiene el encabezado de una factura.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {number} invoiceID Identificador de la factura.
 * @returns {Promise<object[]>} Encabezado en una fila o un arreglo vacío.
 */
export async function getInvoiceHeader(session, invoiceID) {
  const result = await executeProcedure(session, "Sales.GetInvoiceHeader", {
    InvoiceID: [sql.Int, invoiceID],
  });
  return result.recordset;
}

/**
 * Obtiene los campos editables del encabezado de una factura.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {number} invoiceID Identificador de la factura.
 * @returns {Promise<object[]>} Datos para precargar el formulario.
 */
export async function getInvoiceForEdit(session, invoiceID) {
  const result = await executeProcedure(session, "Sales.GetInvoiceForEdit", {
    InvoiceID: [sql.Int, invoiceID],
  });
  return result.recordset;
}

/**
 * Obtiene las líneas de productos de una factura.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {number} invoiceID Identificador de la factura.
 * @returns {Promise<object[]>} Líneas ordenadas por identificador.
 */
export async function getInvoiceLines(session, invoiceID) {
  const result = await executeProcedure(session, "Sales.GetInvoiceLines", {
    InvoiceID: [sql.Int, invoiceID],
  });
  return result.recordset;
}

/**
 * Inserta una factura con sus líneas de detalle.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {object} invoice Encabezado y líneas; lastEditedBy es un PersonID distinto de userID.
 * @returns {Promise<number>} Identificador de la factura creada.
 */
export async function insertInvoice(session, invoice) {
  const result = await executeProcedure(
    session,
    "Sales.InsertInvoice",
    invoiceParameters(invoice),
    { NewInvoiceID: sql.Int },
  );
  return result.output.NewInvoiceID;
}

/**
 * Actualiza una factura y reemplaza sus líneas de detalle.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {number} invoiceID Identificador de la factura.
 * @param {object} invoice Datos actualizados; lastEditedBy es un PersonID distinto de userID.
 * @returns {Promise<void>} Finaliza al actualizar la factura.
 */
export async function updateInvoice(session, invoiceID, invoice) {
  await executeProcedure(session, "Sales.UpdateInvoice", {
    InvoiceID: [sql.Int, invoiceID],
    ...invoiceParameters(invoice),
  });
}
