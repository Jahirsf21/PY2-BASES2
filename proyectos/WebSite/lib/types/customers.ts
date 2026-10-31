import type { PaginatedResponse } from './paginatedResponse'

/** Cliente mostrado en el listado principal de clientes. */
export interface Customer {
  CustomerID: number
  NombreCliente: string
  NombreCategoriaCliente: string
  NombreMetodoEntrega: string
}

/** Cliente disponible para asignar como cliente por facturar. */
export interface BillToCustomer {
  CustomerID: number
  NombreCliente: string
}

/** Categoría a la que puede pertenecer un cliente. */
export interface CustomerCategory {
  CustomerCategoryID: number
  NombreCategoria: string
}

/** Agrupación de compra que puede asociarse a un cliente. */
export interface BuyingGroup {
  BuyingGroupID: number
  NombreGrupoCompra: string
}

/** Información general de un cliente. */
export interface CustomerDetail {
  CustomerID: number
  NombreCliente: string
  NombreCategoriaCliente: string
  NombreGrupoCompra: string | null
  NombreClientePorFacturar: string
  NombreMetodoEntrega: string
  DiasGraciaPago: number
  SitioWeb: string | null
}

/** Datos de los contactos principal y alternativo de un cliente. */
export interface CustomerContact {
  NombreContactoPrincipal: string | null
  TelefonoPrincipal: string | null
  FaxPrincipal: string | null
  CorreoPrincipal: string | null
  NombreContactoAlternativo: string | null
  TelefonoAlternativo: string | null
  FaxAlternativo: string | null
  CorreoAlternativo: string | null
}

/** Direcciones postal y de entrega, junto con la ubicación geográfica del cliente. */
export interface CustomerAddress {
  DireccionEntrega1: string
  DireccionEntrega2: string | null
  CiudadEntrega: string
  ProvinciaEntrega: string
  PaisEntrega: string
  CodigoPostalEntrega: string
  DireccionPostal1: string
  DireccionPostal2: string | null
  CiudadPostal: string
  ProvinciaPostal: string
  PaisPostal: string
  CodigoPostalPostal: string
  Latitud: number | null
  Longitud: number | null
}

/** Filtros disponibles para consultar el listado de clientes. */
export interface CustomerFilters {
  customerName: string
  customerCategoryID: number | null
  deliveryMethodID: number | null
}

/** Parámetro de la ruta de detalle de un cliente. */
export interface CustomerRouteParams extends Record<string, string | string[]> {
  customerID: string
}

/** Respuesta paginada del listado principal de clientes. */
export type CustomersResponse = PaginatedResponse<Customer>

/** Respuesta paginada de clientes disponibles para facturación. */
export type BillToCustomersResponse = PaginatedResponse<BillToCustomer>

/** Datos enviados al crear o actualizar un cliente. */
export interface NewCustomer {
  customerName: string
  customerCategoryID: number
  billToCustomerID?: number | null
  lastEditedBy: number
  primaryContactPersonID: number
  deliveryMethodID: number
  paymentDays: number
  phoneNumber: string
  deliveryAddressLine1: string
  deliveryCityID: number
  deliveryPostalCode: string
  postalAddressLine1: string
  standardDiscountPercentage?: number
  creditLimit?: number | null
  isStatementSent?: boolean
  isOnCreditHold?: boolean
  buyingGroupID?: number | null
  alternateContactPersonID?: number | null
  faxNumber?: string | null
  websiteURL?: string | null
  deliveryAddressLine2?: string | null
  postalAddressLine2?: string | null
  latitude?: number | null
  longitude?: number | null
}

/** Respuesta de Sales.GetCustomerForEdit para precargar la edición. */
export interface CustomerEdit {
  CustomerID: number
  NombreCliente: string
  CustomerCategoryID: number
  BillToCustomerID: number
  NombreClientePorFacturar: string
  LastEditedBy: number
  PorcentajeDescuentoEstandar: number
  LimiteCredito: number | null
  EnviarEstadoCuenta: boolean
  CreditoSuspendido: boolean
  BuyingGroupID: number | null
  PrimaryContactPersonID: number
  NombreContactoPrincipal: string
  AlternateContactPersonID: number | null
  NombreContactoAlternativo: string | null
  DeliveryMethodID: number
  DiasGraciaPago: number
  Telefono: string
  Fax: string | null
  SitioWeb: string | null
  DireccionEntrega1: string
  DireccionEntrega2: string | null
  DeliveryCityID: number
  CiudadEntrega: string
  CodigoPostalEntrega: string
  DireccionPostal1: string
  DireccionPostal2: string | null
  Latitud: number | null
  Longitud: number | null
}
