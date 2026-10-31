import type { PaginatedResponse } from './paginatedResponse'

/** Proveedor mostrado en el listado principal. */
export interface Supplier {
  SupplierID: number
  NombreProveedor: string
  NombreCategoriaProveedor: string
  NombreMetodoEntrega: string | null
}

/** Categoría disponible para filtrar proveedores. */
export interface SupplierCategory {
  SupplierCategoryID: number
  NombreCategoriaProveedor: string
}

/** Datos enviados al crear o actualizar un proveedor. */
export interface NewSupplier {
  supplierName: string
  supplierCategoryID: number
  lastEditedBy: number
  supplierReference: string | null
  primaryContactPersonID: number
  alternateContactPersonID: number
  deliveryMethodID: number
  paymentDays: number
  phoneNumber: string
  faxNumber: string | null
  websiteURL: string | null
  bankAccountName: string | null
  bankAccountBranch: string | null
  bankAccountCode: string | null
  bankAccountNumber: string | null
  bankInternationalCode: string | null
  deliveryAddressLine1: string
  deliveryAddressLine2: string | null
  deliveryCityID: number
  deliveryPostalCode: string
  postalAddressLine1: string
  postalAddressLine2: string | null
  internalComments: string | null
  latitude: number | null
  longitude: number | null
}

/** Respuesta de Purchasing.GetSupplierForEdit para precargar la edición. */
export interface SupplierEdit {
  SupplierID: number
  NombreProveedor: string
  SupplierCategoryID: number
  LastEditedBy: number
  CodigoProveedor: string | null
  PrimaryContactPersonID: number
  NombreContactoPrincipal: string
  AlternateContactPersonID: number
  NombreContactoAlternativo: string
  DeliveryMethodID: number | null
  DiasGraciaPago: number
  Telefono: string
  Fax: string | null
  SitioWeb: string | null
  NombreBanco: string | null
  SucursalBanco: string | null
  CodigoCuentaBancaria: string | null
  NumeroCuentaBancaria: string | null
  CodigoSwift: string | null
  DireccionEntrega1: string
  DireccionEntrega2: string | null
  DeliveryCityID: number
  CiudadEntrega: string
  CodigoPostalEntrega: string
  DireccionPostal1: string
  DireccionPostal2: string | null
  ComentariosInternos: string | null
  Latitud: number | null
  Longitud: number | null
}

/** Información general y bancaria de un proveedor. */
export interface SupplierDetail {
  SupplierID: number
  CodigoProveedor: string | null
  NombreProveedor: string
  NombreCategoriaProveedor: string
  NombreMetodoEntrega: string | null
  DiasGraciaPago: number
  Telefono: string
  Fax: string | null
  SitioWeb: string | null
  NombreBanco: string | null
  SucursalBanco: string | null
  NumeroCuentaBancaria: string | null
  CodigoSwift: string | null
}

/** Contactos principal y alternativo de un proveedor. */
export interface SupplierContact {
  NombreContactoPrincipal: string | null
  TelefonoPrincipal: string | null
  FaxPrincipal: string | null
  CorreoPrincipal: string | null
  NombreContactoAlternativo: string | null
  TelefonoAlternativo: string | null
  FaxAlternativo: string | null
  CorreoAlternativo: string | null
}

/** Direcciones y ubicación de entrega de un proveedor. */
export interface SupplierAddress {
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

/** Parámetro de la ruta de detalle de un proveedor. */
export interface SupplierRouteParams extends Record<string, string | string[]> {
  supplierID: string
}

/** Filtros disponibles para consultar proveedores. */
export interface SupplierFilters {
  supplierName: string
  supplierCategoryID: number | null
  deliveryMethodID: number | null
}

/** Respuesta paginada del listado de proveedores. */
export type SuppliersResponse = PaginatedResponse<Supplier>
