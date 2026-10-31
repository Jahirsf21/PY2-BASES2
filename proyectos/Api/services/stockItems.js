import {getPool} from '../config/database.js'
import sql from "mssql"

/**
 * Obtiene una página de productos junto con el total de registros.
 * Permite filtrar opcionalmente por nombre de producto y grupos.
 *
 * @param {string|null} stockItemName Nombre del producto (búsqueda parcial) o null para no filtrar.
 * @param {string|null} stockGroupIDsJson Arreglo JSON de IDs de grupos de productos; null o [] para no filtrar.
 * @param {number} pageNumber Número de página solicitado.
 * @param {number} pageSize Cantidad de productos por página.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de registros y productos de la página.
 */
export async function getStockItems(stockItemName, stockGroupIDsJson, pageNumber, pageSize) {
    const connection = (await getPool()).request()
    connection.input('StockItemName', sql.NVarChar, stockItemName)
    connection.input('StockGroupIDsJson', sql.NVarChar(sql.MAX), stockGroupIDsJson)
    connection.input('PageNumber', sql.Int, pageNumber)
    connection.input('PageSize', sql.Int, pageSize)
    connection.output('TotalCount', sql.Int)
    const result = await connection.execute('Warehouse.GetStockItems')
    return {
        totalCount: result.output.TotalCount,
        data: result.recordset
    }
}

/**
 * Obtiene todos los grupos de productos.
 *
 * @returns {Promise<object[]>} Listado de grupos de productos.
 */
export async function getStockGroups() {
    const connection = (await getPool()).request()
    const result = await connection.execute('Warehouse.GetStockGroups')
    return result.recordset
}

/**
 * Obtiene los colores disponibles para el formulario de productos.
 *
 * @returns {Promise<object[]>} Listado de colores.
 */
export async function getColors() {
    const connection = (await getPool()).request()
    const result = await connection.execute('Warehouse.GetColors')
    return result.recordset
}

/**
 * Obtiene los tipos de empaque disponibles para productos.
 *
 * @returns {Promise<object[]>} Listado de empaques.
 */
export async function getPackageTypes() {
    const connection = (await getPool()).request()
    const result = await connection.execute('Warehouse.GetPackageTypes')
    return result.recordset
}

/**
 * Obtiene el detalle general de un producto.
 *
 * @param {number} stockItemID Identificador del producto.
 * @returns {Promise<object[]>} Datos del producto en una fila o un arreglo vacío.
 */
export async function getStockItemDetail(stockItemID) {
    const connection = (await getPool()).request()
    connection.input('StockItemID', sql.Int, stockItemID)
    const result = await connection.execute('Warehouse.GetStockItemDetail')
    return result.recordset
}

/**
 * Obtiene los campos editables de un producto y los nombres de sus referencias.
 *
 * @param {number} stockItemID Identificador del producto.
 * @returns {Promise<object[]>} Datos para precargar el formulario.
 */
export async function getStockItemForEdit(stockItemID) {
    const connection = (await getPool()).request()
    connection.input('StockItemID', sql.Int, stockItemID)
    const result = await connection.execute('Warehouse.GetStockItemForEdit')
    return result.recordset
}

/**
 * Obtiene los grupos asociados a un producto.
 *
 * @param {number} stockItemID Identificador del producto.
 * @returns {Promise<object[]>} Grupos del producto o un arreglo vacío.
 */
export async function getStockItemGroups(stockItemID) {
    const connection = (await getPool()).request()
    connection.input('StockItemID', sql.Int, stockItemID)
    const result = await connection.execute('Warehouse.GetStockItemStockGroups')
    return result.recordset
}

/**
 * Inserta un producto con existencias y grupos iniciales.
 *
 * @param {object} item Datos del producto.
 * @returns {Promise<number>} Identificador del producto creado.
 */
export async function insertStockItem(item) {
    const connection = (await getPool()).request()
    connection.input('StockItemName', sql.NVarChar, item.stockItemName)
    connection.input('SupplierID', sql.Int, item.supplierID)
    connection.input('LastEditedBy', sql.Int, item.lastEditedBy)
    connection.input('LeadTimeDays', sql.Int, item.leadTimeDays ?? 1)
    connection.input('IsChillerStock', sql.Bit, item.isChillerStock ?? false)
    connection.input('LastCostPrice', sql.Decimal(18, 2), item.lastCostPrice ?? 0)
    connection.input('ReorderLevel', sql.Int, item.reorderLevel ?? 0)
    connection.input('TargetStockLevel', sql.Int, item.targetStockLevel ?? 0)
    connection.input('ColorID', sql.Int, item.colorID ?? null)
    connection.input('UnitPackageID', sql.Int, item.unitPackageID)
    connection.input('OuterPackageID', sql.Int, item.outerPackageID)
    connection.input('Brand', sql.NVarChar, item.brand ?? null)
    connection.input('Size', sql.NVarChar, item.size ?? null)
    connection.input('QuantityPerOuter', sql.Int, item.quantityPerOuter ?? 1)
    connection.input('Barcode', sql.NVarChar, item.barcode ?? null)
    connection.input('TaxRate', sql.Decimal(18, 3), item.taxRate)
    connection.input('UnitPrice', sql.Decimal(18, 2), item.unitPrice)
    connection.input('RecommendedRetailPrice', sql.Decimal(18, 2), item.recommendedRetailPrice ?? null)
    connection.input('TypicalWeightPerUnit', sql.Decimal(18, 3), item.typicalWeightPerUnit ?? null)
    connection.input('StockGroupIDsJson', sql.NVarChar(sql.MAX), JSON.stringify(item.stockGroupIDs))
    connection.input('QuantityOnHand', sql.Int, item.quantityOnHand ?? 0)
    connection.input('BinLocation', sql.NVarChar, item.binLocation ?? null)
    connection.output('NewStockItemID', sql.Int)
    const result = await connection.execute('Warehouse.InsertStockItem')
    return result.output.NewStockItemID
}

/**
 * Actualiza un producto, sus existencias y sus grupos.
 *
 * @param {number} stockItemID Identificador del producto.
 * @param {object} item Datos actualizados.
 * @returns {Promise<void>} Finaliza al actualizar el producto.
 */
export async function updateStockItem(stockItemID, item) {
    const connection = (await getPool()).request()
    connection.input('StockItemID', sql.Int, stockItemID)
    connection.input('StockItemName', sql.NVarChar, item.stockItemName)
    connection.input('SupplierID', sql.Int, item.supplierID)
    connection.input('LastEditedBy', sql.Int, item.lastEditedBy)
    connection.input('LeadTimeDays', sql.Int, item.leadTimeDays ?? 1)
    connection.input('IsChillerStock', sql.Bit, item.isChillerStock ?? false)
    connection.input('LastCostPrice', sql.Decimal(18, 2), item.lastCostPrice ?? 0)
    connection.input('ReorderLevel', sql.Int, item.reorderLevel ?? 0)
    connection.input('TargetStockLevel', sql.Int, item.targetStockLevel ?? 0)
    connection.input('ColorID', sql.Int, item.colorID ?? null)
    connection.input('UnitPackageID', sql.Int, item.unitPackageID)
    connection.input('OuterPackageID', sql.Int, item.outerPackageID)
    connection.input('Brand', sql.NVarChar, item.brand ?? null)
    connection.input('Size', sql.NVarChar, item.size ?? null)
    connection.input('QuantityPerOuter', sql.Int, item.quantityPerOuter ?? 1)
    connection.input('Barcode', sql.NVarChar, item.barcode ?? null)
    connection.input('TaxRate', sql.Decimal(18, 3), item.taxRate)
    connection.input('UnitPrice', sql.Decimal(18, 2), item.unitPrice)
    connection.input('RecommendedRetailPrice', sql.Decimal(18, 2), item.recommendedRetailPrice ?? null)
    connection.input('TypicalWeightPerUnit', sql.Decimal(18, 3), item.typicalWeightPerUnit ?? null)
    connection.input('StockGroupIDsJson', sql.NVarChar(sql.MAX), JSON.stringify(item.stockGroupIDs))
    connection.input('QuantityOnHand', sql.Int, item.quantityOnHand ?? 0)
    connection.input('BinLocation', sql.NVarChar, item.binLocation ?? null)
    await connection.execute('Warehouse.UpdateStockItem')
}

/**
 * Elimina un producto si no tiene registros relacionados.
 *
 * @param {number} stockItemID Identificador del producto.
 * @returns {Promise<void>} Finaliza al eliminar el producto.
 */
export async function deleteStockItem(stockItemID) {
    const connection = (await getPool()).request()
    connection.input('StockItemID', sql.Int, stockItemID)
    await connection.execute('Warehouse.DeleteStockItem')
}
