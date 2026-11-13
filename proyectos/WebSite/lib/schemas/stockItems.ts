import { z } from 'zod'
import { SQL_INT_MAX, amountSchema, booleanSchema, idSchema, textSchema } from './common'

const groupsMessage = 'Seleccione al menos un grupo de productos válido, sin repeticiones.'
/** Identificador de grupo de productos dentro del rango int de SQL Server. */
const stockGroupIDSchema = z.number({ error: groupsMessage }).int({ error: groupsMessage })
  .min(1, { error: groupsMessage }).max(SQL_INT_MAX, { error: groupsMessage })

/** Versión opaca devuelta por la API: '0x' seguido de 16 dígitos hexadecimales. */
export const versionSchema = z.string({ error: 'La versión es obligatoria. Recargue los datos.' })
  .regex(/^0x[0-9A-Fa-f]{16}$/, { error: 'La versión no es válida. Recargue los datos.' })

/**
 * Datos del catálogo de un producto, sin existencias.
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
  leadTimeDays: amountSchema('leadTimeDays', 0),
  quantityPerOuter: amountSchema('quantityPerOuter', 0)
    .refine(value => value !== 0, { error: 'quantityPerOuter debe ser mayor que cero.' }),
  unitPrice: amountSchema('unitPrice', 2, true),
  recommendedRetailPrice: amountSchema('recommendedRetailPrice', 2),
  taxRate: amountSchema('taxRate', 3, true),
  typicalWeightPerUnit: amountSchema('typicalWeightPerUnit', 3),
  isChillerStock: booleanSchema('isChillerStock'),
})

/** Datos del catálogo al editar, con la versión cargada en el formulario. */
export const stockItemUpdateSchema = stockItemSchema.extend({ version: versionSchema })

/** Valores absolutos de las existencias en la sucursal; version es null si todavía no hay fila. */
export const stockItemHoldingsSchema = z.object({
  lastEditedBy: idSchema('Empleado', true),
  quantityOnHand: amountSchema('quantityOnHand', 0, true),
  binLocation: textSchema('binLocation', 20),
  lastCostPrice: amountSchema('lastCostPrice', 2, true),
  reorderLevel: amountSchema('reorderLevel', 0, true),
  targetStockLevel: amountSchema('targetStockLevel', 0, true),
  version: versionSchema.nullable(),
})
