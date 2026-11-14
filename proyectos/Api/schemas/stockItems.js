import { z } from "zod";
import {
  SQL_INT_MAX,
  amountSchema,
  booleanSchema,
  idSchema,
  queryText,
  textSchema,
  versionSchema,
} from "./common.js";

const groupsMessage =
  "Seleccione al menos un grupo de productos válido, sin repeticiones.";
/**
 * Valida un identificador de grupo de productos dentro del rango int de SQL Server.
 *
 * @type {import('zod').ZodType<number>}
 */
const stockGroupIDSchema = z
  .number({ error: groupsMessage })
  .int({ error: groupsMessage })
  .min(1, { error: groupsMessage })
  .max(SQL_INT_MAX, { error: groupsMessage });

/**
 * Devuelve el mensaje de los errores generales de un objeto.
 * Indica los campos que no pertenecen al formulario, por ejemplo existencias enviadas al catálogo.
 *
 * @param {string} emptyMessage Mensaje cuando el cuerpo no es un objeto.
 * @returns {(issue: object) => string} Función de mensaje para Zod.
 */
function objectError(emptyMessage) {
  return (issue) =>
    issue.code === "unrecognized_keys"
      ? `Campos no permitidos: ${issue.keys.join(", ")}.`
      : emptyMessage;
}

/** Campos del catálogo de un producto, compartidos por la inserción y la edición. */
const catalogFields = {
  stockItemName: textSchema("Nombre del producto", 100, true),
  supplierID: idSchema("Proveedor", true),
  lastEditedBy: idSchema("Empleado", true),
  colorID: idSchema("Color"),
  unitPackageID: idSchema("Empaque unitario", true),
  outerPackageID: idSchema("Empaque exterior", true),
  stockGroupIDs: z
    .array(stockGroupIDSchema, { error: groupsMessage })
    .min(1, { error: groupsMessage })
    .refine((ids) => new Set(ids).size === ids.length, {
      error: groupsMessage,
    }),
  brand: textSchema("brand", 50),
  size: textSchema("size", 20),
  barcode: textSchema("barcode", 50),
  leadTimeDays: amountSchema("leadTimeDays", 0),
  quantityPerOuter: amountSchema("quantityPerOuter", 0).refine(
    (value) => value !== 0,
    { error: "quantityPerOuter debe ser mayor que cero." },
  ),
  unitPrice: amountSchema("unitPrice", 2, true),
  recommendedRetailPrice: amountSchema("recommendedRetailPrice", 2),
  taxRate: amountSchema("taxRate", 3, true),
  typicalWeightPerUnit: amountSchema("typicalWeightPerUnit", 3),
  isChillerStock: booleanSchema("isChillerStock"),
};

/**
 * Valida la inserción de un producto en el catálogo central.
 * Exige al menos un grupo sin repeticiones y rechaza campos de existencias.
 *
 * @type {import('zod').ZodType}
 */
export const catalogStockItemSchema = z.strictObject(catalogFields, {
  error: objectError("Indique los datos del producto"),
});

/**
 * Valida la edición de un producto del catálogo central con la versión cargada en el formulario.
 *
 * @type {import('zod').ZodType}
 */
export const catalogStockItemUpdateSchema = z.strictObject(
  { ...catalogFields, version: versionSchema },
  { error: objectError("Indique los datos del producto") },
);

/**
 * Valida los valores absolutos de las existencias de un producto en la sucursal.
 * version es null cuando el producto todavía no tiene fila de existencias.
 *
 * @type {import('zod').ZodType}
 */
export const stockItemHoldingsSchema = z.strictObject(
  {
    lastEditedBy: idSchema("Empleado", true),
    quantityOnHand: amountSchema("quantityOnHand", 0, true),
    binLocation: textSchema("binLocation", 20),
    lastCostPrice: amountSchema("lastCostPrice", 2, true),
    reorderLevel: amountSchema("reorderLevel", 0, true),
    targetStockLevel: amountSchema("targetStockLevel", 0, true),
    version: versionSchema.nullable(),
  },
  { error: objectError("Indique las existencias del producto") },
);

/** Filtros del listado de productos; el SP valida el contenido de stockGroupIDsJson. */
export const stockItemsQuery = z.object({
  stockItemName: queryText("El nombre del producto", 100),
  stockGroupIDsJson: queryText("La lista de categorías", 4000),
});
