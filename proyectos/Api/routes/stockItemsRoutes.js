import { Router } from 'express'
import { listStockItems, listStockGroups, listColors, listPackageTypes, getStockItemById, getStockItemEditById, getStockItemGroupsById, addStockItem, editStockItem, removeStockItem } from '../controllers/stockItemsController.js'

// Rutas de Productos.
const router = Router()

/**
 * GET /stock-items
 * Devuelve una página de productos paginada.
 * Query params: pageNumber, pageSize, stockItemName, stockGroupIDsJson
 * stockGroupIDsJson: arreglo JSON de IDs de grupos; null o [] incluye todos.
 */
router.get('/stock-items', listStockItems)

/**
 * POST /stock-items
 * Crea un producto con sus existencias y grupos.
 * Body: datos requeridos por Warehouse.InsertStockItem.
 */
router.post('/stock-items', addStockItem)

/**
 * GET /stock-items/groups
 * Devuelve todos los grupos de productos para el combo de filtros.
 */
router.get('/stock-items/groups', listStockGroups)

/**
 * GET /stock-items/colors
 * Devuelve los colores disponibles para los formularios de productos.
 */
router.get('/stock-items/colors', listColors)

/**
 * GET /stock-items/package-types
 * Devuelve los tipos de empaque disponibles para los formularios de productos.
 */
router.get('/stock-items/package-types', listPackageTypes)

/**
 * GET /stock-items/:stockItemID
 * Devuelve el detalle general de un producto.
 * Path param: stockItemID
 */
router.get('/stock-items/:stockItemID', getStockItemById)

/**
 * GET /stock-items/:stockItemID/edit
 * Devuelve los datos editables de un producto.
 * Path param: stockItemID
 */
router.get('/stock-items/:stockItemID/edit', getStockItemEditById)

/**
 * GET /stock-items/:stockItemID/groups
 * Devuelve los grupos asociados a un producto.
 * Path param: stockItemID
 */
router.get('/stock-items/:stockItemID/groups', getStockItemGroupsById)

/**
 * PUT /stock-items/:stockItemID
 * Actualiza un producto, sus existencias y sus grupos.
 * Path param: stockItemID. Body: datos requeridos por Warehouse.UpdateStockItem.
 */
router.put('/stock-items/:stockItemID', editStockItem)

/**
 * DELETE /stock-items/:stockItemID
 * Elimina un producto por su identificador.
 * Path param: stockItemID
 */
router.delete('/stock-items/:stockItemID', removeStockItem)

export default router
