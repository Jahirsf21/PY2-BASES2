import { z } from 'zod'
import { SQL_INT_MAX, amountSchema, booleanSchema, idSchema, textSchema } from './common'

const groupsMessage = 'Seleccione al menos un grupo de productos válido, sin repeticiones.'
/** Identificador de grupo de productos dentro del rango int de SQL Server. */
const stockGroupIDSchema = z.number({ error: groupsMessage }).int({ error: groupsMessage })
  .min(1, { error: groupsMessage }).max(SQL_INT_MAX, { error: groupsMessage })

/**
 * Datos de creación y actualización de un producto y sus existencias.
 * Exige al menos un grupo de productos, sin identificadores repetidos.
 */
export const stockItemSchema = z.object({
  stockItemName: textSchema('Nombre del producto', 100, true),
  supplierID: idSchema('Proveedor', true),
  lastEditedBy: idSchema('Empleado', true),
  colorID: idSchema('Color'),
  unitPackageID: idSchema('Empaque unitario', true),
  outerPackageID: idSchema('Empaque exterior', true),
  stockGroupIDs: z.array(stockGroupIDSchema, { error: groupsMessage }).min(1, { error: groupsMessage })
    .refine(ids => new Set(ids).size === ids.length, { error: groupsMessage }),
  brand: textSchema('brand', 50),
  size: textSchema('size', 20),
  barcode: textSchema('barcode', 50),
  binLocation: textSchema('binLocation', 20),
  leadTimeDays: amountSchema('leadTimeDays', 0),
  reorderLevel: amountSchema('reorderLevel', 0),
  targetStockLevel: amountSchema('targetStockLevel', 0),
  quantityOnHand: amountSchema('quantityOnHand', 0, true),
  quantityPerOuter: amountSchema('quantityPerOuter', 0)
    .refine(value => value !== 0, { error: 'quantityPerOuter debe ser mayor que cero.' }),
  lastCostPrice: amountSchema('lastCostPrice', 2),
  unitPrice: amountSchema('unitPrice', 2, true),
  recommendedRetailPrice: amountSchema('recommendedRetailPrice', 2),
  taxRate: amountSchema('taxRate', 3, true),
  typicalWeightPerUnit: amountSchema('typicalWeightPerUnit', 3),
  isChillerStock: booleanSchema('isChillerStock'),
})
