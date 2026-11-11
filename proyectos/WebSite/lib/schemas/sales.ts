import { z } from 'zod'
import { amountSchema, idSchema, textSchema } from './common'

/** Línea de factura: producto, cantidad entera mayor que cero y precio con máximo 2 decimales. */
export const invoiceLineSchema = z.object({
  stockItemID: idSchema('Producto', true),
  quantity: amountSchema('quantity', 0, true)
    .refine(value => value !== 0, { error: 'La cantidad debe ser mayor que cero.' }),
  unitPrice: amountSchema('unitPrice', 2, true),
}, { error: 'La línea debe ser un producto con cantidad y precio.' })

/**
 * Encabezado de la factura con al menos una línea.
 * La fecha de factura debe tener el formato AAAA-MM-DD.
 */
export const invoiceSchema = z.object({
  customerID: idSchema('customerID', true),
  deliveryMethodID: idSchema('deliveryMethodID', true),
  contactPersonID: idSchema('contactPersonID', true),
  accountsPersonID: idSchema('accountsPersonID', true),
  packedByPersonID: idSchema('packedByPersonID', true),
  lastEditedBy: idSchema('lastEditedBy', true),
  billToCustomerID: idSchema('Cliente por facturar'),
  salespersonPersonID: idSchema('Vendedor', true),
  customerPurchaseOrderNumber: textSchema('Número de orden', 20),
  deliveryInstructions: textSchema('Instrucciones de entrega', 100),
  invoiceDate: z.iso.date({ error: 'Indique una fecha de factura válida (AAAA-MM-DD).' }),
  lines: z.array(invoiceLineSchema, { error: 'La factura debe contener al menos una línea.' })
    .min(1, { error: 'La factura debe contener al menos una línea.' }),
})
