import { z } from 'zod'

type EmployeeOption = { PersonID: number }
type GroupOption = { StockGroupID: number }

/**
 * Crea el esquema de una selección obligatoria en un control no nativo.
 *
 * @param message Mensaje que se muestra si no hay ninguna opción seleccionada.
 * @returns Esquema que exige un valor seleccionado.
 */
const selection = (message: string) => z.unknown().refine(Boolean, { error: message })

/**
 * Crea el esquema de un empleado seleccionado entre las opciones del catálogo.
 *
 * @param people Empleados disponibles en el catálogo.
 * @param message Mensaje que se muestra si el empleado no es válido.
 * @param requireNonzero Indica si se rechaza el identificador 0.
 * @returns Esquema que exige un PersonID presente en el catálogo.
 */
const employeeSelection = (people: readonly EmployeeOption[], message: string, requireNonzero = false) =>
  z.number({ error: message }).refine(id => (!requireNonzero || Boolean(id)) && people.some(person => person.PersonID === id), { error: message })

/**
 * Crea el esquema de los controles no nativos de un paso del formulario de productos.
 * El paso 0 valida proveedor y empleado; el paso 1, grupos de productos y empaques.
 *
 * @param index Índice del paso actual.
 * @param catalogs Empleados y grupos de productos cargados en el formulario.
 * @returns Esquema del paso, o un objeto sin reglas para los demás pasos.
 */
export function stockItemStepSchema(index: number, catalogs: { employees: readonly EmployeeOption[]; groups: readonly GroupOption[] }) {
  if (index === 0) return z.object({
    supplier: selection('Seleccione el proveedor.'),
    lastEditedBy: employeeSelection(catalogs.employees, 'Seleccione un empleado válido.', true),
  })
  if (index === 1) {
    const message = 'Seleccione al menos un grupo de productos.'
    return z.object({
      stockGroupIDs: z.array(z.number({ error: message }), { error: message }).min(1, { error: message })
        .refine(ids => ids.every(id => catalogs.groups.some(group => group.StockGroupID === id)), { error: message }),
      unitPackageID: selection('Seleccione el empaque unitario.'),
      outerPackageID: selection('Seleccione el empaque exterior.'),
    })
  }
  return z.object({})
}

const quantityMessage = 'Indique una cantidad entera mayor que 0.'
const priceMessage = 'Indique un precio igual o mayor que 0.'
const quantitySchema = z.number().refine(Number.isInteger).min(1)
const priceSchema = z.number().min(0)

/** Línea de la tabla editable de la factura; cantidad y precio se reciben como texto de los campos. */
const editableLineSchema = z.object({
  key: z.unknown().optional(),
  product: selection('Seleccione un producto.'),
  quantity: z.string({ error: quantityMessage }).refine(
    value => Boolean(value.trim()) && quantitySchema.safeParse(Number(value)).success, { error: quantityMessage },
  ),
  unitPrice: z.string({ error: priceMessage }).refine(
    value => Boolean(value.trim()) && priceSchema.safeParse(Number(value)).success, { error: priceMessage },
  ),
})

/**
 * Crea el esquema de los controles no nativos de un paso del formulario de facturas.
 * El paso 0 valida cliente y contacto; el paso 1, entrega y empleados; el paso 2, las líneas.
 *
 * @param index Índice del paso actual.
 * @param catalogs Empleados y vendedores cargados en el formulario.
 * @param pricePending Indica si todavía se están consultando precios de productos.
 * @returns Esquema del paso, o un objeto sin reglas para los demás pasos.
 */
export function invoiceStepSchema(index: number, catalogs: { employees: readonly EmployeeOption[]; salespeople: readonly EmployeeOption[] }, pricePending: boolean) {
  if (index === 0) return z.object({
    customer: selection('Seleccione el cliente.'), contact: selection('Seleccione la persona de contacto.'),
  })
  if (index === 1) return z.object({
    deliveryMethodID: selection('Seleccione un método de entrega.'),
    accountsPersonID: employeeSelection(catalogs.employees, 'Seleccione un empleado válido.'),
    packedByPersonID: employeeSelection(catalogs.employees, 'Seleccione un empleado válido.'),
    lastEditedBy: employeeSelection(catalogs.employees, 'Seleccione un empleado válido.'),
    salespersonPersonID: employeeSelection(catalogs.salespeople, 'Seleccione un vendedor válido.', true),
  })
  if (index === 2) {
    const waiting = 'Espere a que termine la consulta de precios.'
    return z.object({
      lines: z.array(z.unknown()).min(1, { error: pricePending ? waiting : 'Agregue al menos un producto a la factura.' }),
    }).refine(() => !pricePending, { path: ['lines'], error: waiting })
      .and(z.object({ lines: z.array(editableLineSchema) }))
  }
  return z.object({})
}
