import sql from "mssql";
import { executeProcedure } from "../helpers/procedure.js";
import { executeCatalogProcedure } from "../helpers/catalogQuery.js";

/**
 * Convierte la versión '0x' + 16 dígitos hexadecimales al binario que recibe SQL Server.
 *
 * @param {string|null} version Versión validada por el schema, o null.
 * @returns {Buffer|null} Versión binaria de 8 bytes, o null.
 */
function versionToBinary(version) {
  return version ? Buffer.from(version.slice(2), "hex") : null;
}

/**
 * Parámetros de catálogo compartidos por la inserción y la edición central.
 *
 * @param {object} item Datos del producto validados por el schema.
 * @returns {object} Parámetros como { Nombre: [tipo, valor] }.
 */
function catalogParameters(item) {
  return {
    StockItemName: [sql.NVarChar(100), item.stockItemName],
    SupplierID: [sql.Int, item.supplierID],
    LastEditedBy: [sql.Int, item.lastEditedBy],
    LeadTimeDays: [sql.Int, item.leadTimeDays ?? 1],
    IsChillerStock: [sql.Bit, item.isChillerStock ?? false],
    ColorID: [sql.Int, item.colorID ?? null],
    UnitPackageID: [sql.Int, item.unitPackageID],
    OuterPackageID: [sql.Int, item.outerPackageID],
    Brand: [sql.NVarChar(50), item.brand ?? null],
    Size: [sql.NVarChar(20), item.size ?? null],
    QuantityPerOuter: [sql.Int, item.quantityPerOuter ?? 1],
    Barcode: [sql.NVarChar(50), item.barcode ?? null],
    TaxRate: [sql.Decimal(18, 3), item.taxRate],
    UnitPrice: [sql.Decimal(18, 2), item.unitPrice],
    RecommendedRetailPrice: [
      sql.Decimal(18, 2),
      item.recommendedRetailPrice ?? null,
    ],
    TypicalWeightPerUnit: [
      sql.Decimal(18, 3),
      item.typicalWeightPerUnit ?? null,
    ],
    StockGroupIDsJson: [
      sql.NVarChar(sql.MAX),
      JSON.stringify(item.stockGroupIDs),
    ],
  };
}

/**
 * Obtiene una página de productos de la sucursal junto con el total de registros.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {object} filters Filtros stockItemName y stockGroupIDsJson, y paginación pageNumber y pageSize.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de registros y productos de la página.
 */
export async function getStockItems(session, filters) {
  const result = await executeProcedure(
    session,
    "Warehouse.GetStockItems",
    {
      StockItemName: [sql.NVarChar(100), filters.stockItemName ?? null],
      StockGroupIDsJson: [
        sql.NVarChar(sql.MAX),
        filters.stockGroupIDsJson ?? null,
      ],
      PageNumber: [sql.Int, filters.pageNumber],
      PageSize: [sql.Int, filters.pageSize],
    },
    { TotalCount: sql.Int },
  );
  return { totalCount: result.output.TotalCount, data: result.recordset };
}

/**
 * Obtiene los grupos de productos; admite Administrador y Corporativo.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @returns {Promise<object[]>} Listado de grupos de productos.
 */
export async function getStockGroups(session) {
  return (await executeProcedure(session, "Warehouse.GetStockGroups"))
    .recordset;
}

/**
 * Obtiene los colores disponibles para el formulario de productos.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @returns {Promise<object[]>} Listado de colores.
 */
export async function getColors(session) {
  return (await executeProcedure(session, "Warehouse.GetColors")).recordset;
}

/**
 * Obtiene los tipos de empaque disponibles para productos.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @returns {Promise<object[]>} Listado de empaques.
 */
export async function getPackageTypes(session) {
  return (await executeProcedure(session, "Warehouse.GetPackageTypes"))
    .recordset;
}

/**
 * Obtiene el detalle general de un producto en la sucursal.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {number} stockItemID Identificador del producto.
 * @returns {Promise<object[]>} Datos del producto en una fila o un arreglo vacío.
 */
export async function getStockItemDetail(session, stockItemID) {
  const result = await executeProcedure(
    session,
    "Warehouse.GetStockItemDetail",
    { StockItemID: [sql.Int, stockItemID] },
  );
  return result.recordset;
}

/**
 * Obtiene los grupos asociados a un producto en la sucursal.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {number} stockItemID Identificador del producto.
 * @returns {Promise<object[]>} Grupos del producto o un arreglo vacío.
 */
export async function getStockItemGroups(session, stockItemID) {
  const result = await executeProcedure(
    session,
    "Warehouse.GetStockItemStockGroups",
    { StockItemID: [sql.Int, stockItemID] },
  );
  return result.recordset;
}

/**
 * Obtiene de Corporativo los valores editables del catálogo, sus grupos y su versión en una misma lectura.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {number} stockItemID Identificador del producto.
 * @returns {Promise<object|null>} Producto con Grupos y Version, o null si no existe.
 */
export async function getCatalogStockItemForEdit(session, stockItemID) {
  const result = await executeCatalogProcedure(
    session,
    "Warehouse.GetCatalogStockItemForEdit",
    { StockItemID: [sql.Int, stockItemID] },
  );
  const [items = [], groups = []] = result.recordsets;
  return items[0] ? { ...items[0], Grupos: groups } : null;
}

/**
 * Inserta un producto en el catálogo central con sus grupos y su versión inicial.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {object} item Datos del catálogo validados; lastEditedBy es un PersonID distinto de userID.
 * @returns {Promise<{stockItemID: number, version: string}>} Producto creado y su versión.
 */
export async function insertCatalogStockItem(session, item) {
  const result = await executeCatalogProcedure(
    session,
    "Warehouse.InsertCatalogStockItem",
    catalogParameters(item),
    { NewStockItemID: sql.Int, NewVersion: sql.VarChar(18) },
  );
  return {
    stockItemID: result.output.NewStockItemID,
    version: result.output.NewVersion,
  };
}

/**
 * Actualiza un producto del catálogo central si la versión del formulario sigue vigente.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {number} stockItemID Identificador del producto.
 * @param {object} item Datos del catálogo validados, con version.
 * @returns {Promise<string>} Nueva versión del producto.
 */
export async function updateCatalogStockItem(session, stockItemID, item) {
  const result = await executeCatalogProcedure(
    session,
    "Warehouse.UpdateCatalogStockItem",
    {
      StockItemID: [sql.Int, stockItemID],
      ...catalogParameters(item),
      ExpectedVersion: [sql.Binary(8), versionToBinary(item.version)],
    },
    { NewVersion: sql.VarChar(18) },
  );
  return result.output.NewVersion;
}

/**
 * Obtiene las existencias de un producto en la sucursal para ajustarlas.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {number} stockItemID Identificador del producto.
 * @returns {Promise<object|null>} Existencias con Version, o null si el producto no está en la sucursal.
 */
export async function getStockItemHoldings(session, stockItemID) {
  const result = await executeProcedure(
    session,
    "Warehouse.GetStockItemHoldingsForAdjustment",
    { StockItemID: [sql.Int, stockItemID] },
  );
  return result.recordset[0] ?? null;
}

/**
 * Guarda los valores absolutos de las existencias de un producto en la sucursal.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {number} stockItemID Identificador del producto.
 * @param {object} holdings Existencias validadas, con version null si todavía no hay fila.
 * @returns {Promise<string>} Nueva versión de las existencias.
 */
export async function adjustStockItemHoldings(session, stockItemID, holdings) {
  const result = await executeProcedure(
    session,
    "Warehouse.AdjustStockItemHoldings",
    {
      StockItemID: [sql.Int, stockItemID],
      QuantityOnHand: [sql.Int, holdings.quantityOnHand],
      BinLocation: [sql.NVarChar(20), holdings.binLocation ?? null],
      LastCostPrice: [sql.Decimal(18, 2), holdings.lastCostPrice],
      ReorderLevel: [sql.Int, holdings.reorderLevel],
      TargetStockLevel: [sql.Int, holdings.targetStockLevel],
      LastEditedBy: [sql.Int, holdings.lastEditedBy],
      ExpectedVersion: [sql.Binary(8), versionToBinary(holdings.version)],
    },
    { NewVersion: sql.VarChar(18) },
  );
  return result.output.NewVersion;
}

/**
 * Elimina un producto en la sucursal si no tiene registros relacionados.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {number} stockItemID Identificador del producto.
 * @returns {Promise<void>} Finaliza al eliminar el producto.
 */
export async function deleteStockItem(session, stockItemID) {
  await executeProcedure(session, "Warehouse.DeleteStockItem", {
    StockItemID: [sql.Int, stockItemID],
  });
}
