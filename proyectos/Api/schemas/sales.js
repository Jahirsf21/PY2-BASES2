import { z } from "zod";
import {
  amountSchema,
  idSchema,
  queryAmount,
  queryDate,
  queryId,
  queryText,
  textSchema,
} from "./common.js";

/**
 * Valida una línea de factura: producto, cantidad entera mayor que cero y precio con máximo 2 decimales.
 *
 * @type {import('zod').ZodType}
 */
export const invoiceLineSchema = z.object(
  {
    stockItemID: idSchema("Producto", true),
    quantity: amountSchema("quantity", 0, true).refine((value) => value !== 0, {
      error: "La cantidad debe ser mayor que cero.",
    }),
    unitPrice: amountSchema("unitPrice", 2, true),
  },
  { error: "La línea debe ser un producto con cantidad y precio." },
);

/**
 * Valida el encabezado de una factura y exige al menos una línea.
 * La fecha de factura debe tener el formato AAAA-MM-DD.
 *
 * @type {import('zod').ZodType}
 */
export const invoiceSchema = z.object(
  {
    customerID: idSchema("customerID", true),
    deliveryMethodID: idSchema("deliveryMethodID", true),
    contactPersonID: idSchema("contactPersonID", true),
    accountsPersonID: idSchema("accountsPersonID", true),
    packedByPersonID: idSchema("packedByPersonID", true),
    lastEditedBy: idSchema("lastEditedBy", true),
    billToCustomerID: idSchema("Cliente por facturar"),
    salespersonPersonID: idSchema("Vendedor", true),
    customerPurchaseOrderNumber: textSchema("Número de orden", 20),
    deliveryInstructions: textSchema("Instrucciones de entrega", 100),
    invoiceDate: z.iso.date({
      error: "Indique una fecha de factura válida (AAAA-MM-DD).",
    }),
    lines: z
      .array(invoiceLineSchema, {
        error: "La factura debe contener al menos una línea.",
      })
      .min(1, { error: "La factura debe contener al menos una línea." }),
  },
  { error: "Indique los datos de la factura" },
);

/** Filtros del listado de facturas; el SP valida rangos y signos. */
export const invoicesQuery = z.object({
  invoiceID: queryId("El número de factura"),
  invoiceDateFrom: queryDate("La fecha inicial"),
  invoiceDateTo: queryDate("La fecha final"),
  customerName: queryText("El nombre del cliente", 100),
  deliveryMethodID: queryId("El método de entrega"),
  minInvoiceAmount: queryAmount("El monto mínimo"),
  maxInvoiceAmount: queryAmount("El monto máximo"),
});
