/** Factura mostrada en el listado de ventas. */
export interface Invoice {
  NumeroFactura: number
  FechaFactura: string
  NombreCliente: string
  NombreMetodoEntrega: string
  MontoFacturado: number
}

/** Filtros disponibles para consultar facturas. */
export interface InvoiceFilters {
  invoiceID: number | null
  invoiceDateFrom: string
  invoiceDateTo: string
  customerName: string
  deliveryMethodID: number | null
  minInvoiceAmount: number | null
  maxInvoiceAmount: number | null
}

/** Respuesta paginada del listado de facturas. */
export interface InvoicesResponse {
  page: number
  size: number
  totalCount: number
  totalPages: number
  data: Invoice[]
}

/** Encabezado de una factura devuelto por el GET de detalle. */
export interface InvoiceHeader {
  NumeroFactura: number
  NombreCliente: string
  NombreMetodoEntrega: string | null
  NumeroOrden: string | null
  NombreContacto: string | null
  NombreVendedor: string | null
  FechaFactura: string
  InstruccionesEntrega: string | null
}

/** Línea de factura devuelta por el GET de líneas. */
export interface InvoiceLine {
  StockItemID: number
  NombreProducto: string
  Cantidad: number
  PrecioUnitario: number
  ImpuestoAplicado: number
  MontoImpuesto: number
  TotalLinea: number
}

/** Vista formada a partir de los GET de encabezado y líneas. */
export interface InvoiceDetail { header: InvoiceHeader; lines: InvoiceLine[] }

/** Encabezado editable devuelto por GET /sales/:invoiceID/edit. */
export interface InvoiceEdit {
  InvoiceID: number
  CustomerID: number
  CustomerName: string
  BillToCustomerID: number
  BillToCustomerName: string
  DeliveryMethodID: number
  ContactPersonID: number
  ContactPersonName: string | null
  AccountsPersonID: number
  AccountsPersonName: string | null
  PackedByPersonID: number
  PackedByPersonName: string | null
  LastEditedBy: number
  LastEditorName: string | null
  SalespersonPersonID: number
  SalespersonName: string
  CustomerPurchaseOrderNumber: string | null
  InvoiceDate: string
  DeliveryInstructions: string | null
}

/** Datos enviados al crear o actualizar una factura con sus líneas. */
export interface NewInvoice {
  customerID: number
  billToCustomerID: number | null
  deliveryMethodID: number
  contactPersonID: number
  accountsPersonID: number
  packedByPersonID: number
  lastEditedBy: number
  salespersonPersonID: number | null
  customerPurchaseOrderNumber: string | null
  invoiceDate: string
  deliveryInstructions: string | null
  lines: { stockItemID: number; quantity: number; unitPrice: number }[]
}
