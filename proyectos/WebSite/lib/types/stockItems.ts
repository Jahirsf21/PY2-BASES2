/** Producto mostrado en el listado de inventario. */
export interface StockItem {
  StockItemID: number
  NombreProducto: string
  NombreGrupoProducto: string
  CantidadTotalEnInventarios: number
}

/** Grupo disponible para filtrar productos o asociarlo a un producto. */
export interface StockGroup {
  StockGroupID: number
  NombreGrupoProducto: string
}

/** Filtros disponibles para consultar el inventario. */
export interface StockItemFilters {
  stockItemName: string
  stockGroupIDs: number[]
}

/** Respuesta paginada del listado de productos. */
export interface StockItemsResponse {
  page: number
  size: number
  totalCount: number
  totalPages: number
  data: StockItem[]
}

/** Información general de un producto devuelta por el GET de detalle. */
export interface StockItemDetail {
  StockItemID: number
  NombreProducto: string
  NombreProveedor: string | null
  Color: string | null
  UnidadEmpaquetamiento: string | null
  Empaquetamiento: string | null
  CantidadEmpaquetamiento: number
  Marca: string | null
  Talla: string | null
  Impuesto: number
  PrecioUnitario: number
  PrecioVenta: number | null
  Peso: number | null
  PalabrasClave: string | null
  CantidadDisponible: number | null
  Ubicacion: string | null
}

/** Datos editables del catálogo devueltos por Corporativo, con sus grupos y su versión. */
export interface StockItemEdit {
  StockItemID: number
  StockItemName: string
  SupplierID: number
  SupplierName: string
  LastEditedBy: number
  LeadTimeDays: number
  IsChillerStock: boolean
  ColorID: number | null
  ColorName: string | null
  UnitPackageID: number
  UnitPackageName: string
  OuterPackageID: number
  OuterPackageName: string
  Brand: string | null
  Size: string | null
  QuantityPerOuter: number
  Barcode: string | null
  TaxRate: number
  UnitPrice: number
  RecommendedRetailPrice: number | null
  TypicalWeightPerUnit: number | null
  /** Versión opaca del catálogo; se envía sin cambios al guardar. */
  Version: string
  Grupos: StockGroup[]
}

/** Datos del catálogo enviados al crear un producto, sin existencias. */
export interface NewStockItem {
  stockItemName: string
  supplierID: number
  lastEditedBy: number
  unitPackageID: number
  outerPackageID: number
  stockGroupIDs: number[]
  taxRate: number
  unitPrice: number
  leadTimeDays: number
  isChillerStock: boolean
  colorID: number | null
  brand: string | null
  size: string | null
  quantityPerOuter: number
  barcode: string | null
  recommendedRetailPrice: number | null
  typicalWeightPerUnit: number | null
}

/** Datos del catálogo enviados al editar un producto, con la versión cargada en el formulario. */
export interface StockItemUpdate extends NewStockItem {
  version: string
}

/** Existencias del producto en la sucursal; sin fila, la cantidad es 0 y los demás valores null. */
export interface StockItemHoldings {
  StockItemID: number
  StockItemName: string
  QuantityOnHand: number
  BinLocation: string | null
  LastCostPrice: number | null
  ReorderLevel: number | null
  TargetStockLevel: number | null
  /** Versión opaca de las existencias, o null si todavía no hay fila. */
  Version: string | null
}

/** Valores absolutos enviados al ajustar las existencias en la sucursal. */
export interface StockItemHoldingsUpdate {
  lastEditedBy: number
  quantityOnHand: number
  binLocation: string | null
  lastCostPrice: number
  reorderLevel: number
  targetStockLevel: number
  version: string | null
}

/** Color disponible para asignar a un producto. */
export interface Color { ColorID: number; ColorName: string }

/** Tipo de empaque disponible para asignar a un producto. */
export interface PackageType { PackageTypeID: number; PackageTypeName: string }
