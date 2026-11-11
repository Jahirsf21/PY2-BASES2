import { z } from 'zod'
import { SQL_INT_MAX, booleanSchema, idSchema, isEmpty, textSchema, withPresence } from './common'

const daysMessage = 'Días para pagar debe ser un entero no negativo de hasta 2147483647.'

/** Días para pagar: entero no negativo dentro del rango int de SQL Server. */
const paymentDaysSchema = withPresence(
  z.number({ error: daysMessage }).int({ error: daysMessage }).min(0, { error: daysMessage }).max(SQL_INT_MAX, { error: daysMessage }),
  'Días para pagar', true, daysMessage,
)

const websiteMessage = 'Sitio web debe ser una URL http o https válida.'

/** URL con protocolo http o https. */
const httpUrlSchema = z.url({ error: websiteMessage }).pipe(z.string().refine(
  value => ['http:', 'https:'].includes(new URL(value).protocol), { error: websiteMessage },
))

/** Sitio web opcional: primero su longitud máxima de 256 caracteres y después su protocolo. */
const websiteSchema = textSchema('Sitio web', 256)
  .refine(value => isEmpty(value) || httpUrlSchema.safeParse(value).success, { error: websiteMessage }).optional()

/** Latitud entre -90 y 90 y longitud entre -180 y 180. */
const coordinatePairSchema = z.object({
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
})

/**
 * Exige ambas coordenadas válidas o ninguna.
 * Si la pareja es inválida, informa el mismo mensaje en latitude y en longitude.
 */
const coordinatesSchema = z.object({ latitude: z.unknown().optional(), longitude: z.unknown().optional() })
  .superRefine((data, ctx) => {
    if (isEmpty(data.latitude) && isEmpty(data.longitude)) return
    if (coordinatePairSchema.safeParse(data).success) return
    const message = 'Ingrese ambas coordenadas válidas (latitud entre -90 y 90, longitud entre -180 y 180) o deje las dos vacías.'
    ctx.addIssue({ code: 'custom', path: ['latitude'], message })
    ctx.addIssue({ code: 'custom', path: ['longitude'], message })
  })

/**
 * Campos compartidos por clientes y proveedores.
 * Las intersecciones evitan que un tipo inválido en otro campo oculte la regla de las coordenadas.
 */
const commonEntitySchema = z.object({
  lastEditedBy: idSchema('Empleado', true),
  primaryContactPersonID: idSchema('Contacto principal', true),
  deliveryMethodID: idSchema('Método de entrega', true),
  paymentDays: paymentDaysSchema,
  phoneNumber: textSchema('Teléfono', 20, true),
  faxNumber: textSchema('Fax', 20),
  websiteURL: websiteSchema,
  deliveryAddressLine1: textSchema('Dirección de entrega, línea 1', 60, true),
  deliveryAddressLine2: textSchema('Dirección de entrega, línea 2', 60),
  deliveryCityID: idSchema('Ciudad de entrega', true),
  deliveryPostalCode: textSchema('Código postal', 10, true),
  postalAddressLine1: textSchema('Dirección postal, línea 1', 60, true),
  postalAddressLine2: textSchema('Dirección postal, línea 2', 60),
}).and(coordinatesSchema)

const discountMessage = 'Descuento estándar debe ser un número entre 0 y 100 con máximo 3 decimales.'
const creditMessage = 'Límite de crédito debe ser un número no negativo y menor que 10^16 con máximo 2 decimales.'
/** Campos propios del cliente: contacto alternativo, descuento, crédito, estados de cuenta y grupo de compra. */
const customerDetailsSchema = z.object({
  alternateContactPersonID: idSchema('Contacto alternativo'),
  standardDiscountPercentage: withPresence(
    z.number({ error: discountMessage }).min(0, { error: discountMessage }).max(100, { error: discountMessage })
      .refine(value => Number(value.toFixed(3)) === value, { error: discountMessage }),
    'Descuento estándar', false, discountMessage,
  ),
  creditLimit: withPresence(
    z.number({ error: creditMessage }).min(0, { error: creditMessage }).lt(1e16, { error: creditMessage })
      .refine(value => Number(value.toFixed(2)) === value, { error: creditMessage }),
    'Límite de crédito', false, creditMessage,
  ),
  isStatementSent: booleanSchema('Enviar estados de cuenta'),
  isOnCreditHold: booleanSchema('Crédito suspendido'),
  buyingGroupID: idSchema('Grupo de compra'),
})

/**
 * Crea el esquema de creación o actualización de un cliente.
 * Al crear, billToCustomerID puede omitirse; al actualizar, es obligatorio.
 *
 * @param updating Indica si se está actualizando un cliente existente.
 * @returns Esquema del cliente con sus campos propios y compartidos.
 */
function customerSchema(updating: boolean) {
  return z.object({
    customerName: textSchema('Nombre del cliente', 100, true),
    customerCategoryID: idSchema('Categoría', true),
    billToCustomerID: idSchema('Cliente por facturar', updating),
  }).and(commonEntitySchema).and(customerDetailsSchema)
}

/** Datos de creación de un cliente. */
export const customerCreateSchema = customerSchema(false)

/** Datos de actualización de un cliente; exige billToCustomerID. */
export const customerUpdateSchema = customerSchema(true)

/** Datos de creación o actualización de un proveedor, incluidos sus datos bancarios. */
export const supplierSchema = z.object({
  supplierName: textSchema('Nombre del proveedor', 100, true),
  supplierCategoryID: idSchema('Categoría', true),
  supplierReference: textSchema('Código de referencia', 20),
}).and(commonEntitySchema).and(z.object({
  alternateContactPersonID: idSchema('Contacto alternativo', true),
  bankAccountName: textSchema('Nombre de la cuenta', 50),
  bankAccountBranch: textSchema('Sucursal', 50),
  bankAccountCode: textSchema('Código de banco', 20),
  bankAccountNumber: textSchema('Número de cuenta', 20),
  bankInternationalCode: textSchema('Código SWIFT', 20),
  internalComments: textSchema('Comentarios internos'),
}))
