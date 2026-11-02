import { Router } from 'express'
import { listStockItems, listStockGroups, listColors, listPackageTypes, getStockItemById, getStockItemEditById, getStockItemGroupsById, addStockItem, editStockItem, removeStockItem } from '../controllers/stockItemsController.js'
import { requireRole } from '../middleware/auth.js'

// Rutas de Productos.
const router = Router()

/**
 * GET /stock-items
 * Devuelve una página de productos paginada.
 * Query params: pageNumber, pageSize, stockItemName, stockGroupIDsJson
 * stockGroupIDsJson: arreglo JSON de IDs de grupos; null o [] incluye todos.
 */
router.get('/stock-items', requireRole('Administrador'), listStockItems)

/**
 * POST /stock-items
 * Crea un producto con sus existencias y grupos.
 * Body: datos requeridos por Warehouse.InsertStockItem.
 */
router.post('/stock-items', requireRole('Administrador'), addStockItem)

/**
 * GET /stock-items/groups
 * Devuelve los grupos para inventario y filtros de reportes; admite ambos roles.
 */
router.get('/stock-items/groups', requireRole('Administrador', 'Corporativo'), listStockGroups)

/**
 * GET /stock-items/colors
 * Devuelve los colores disponibles para los formularios de productos.
 */
router.get('/stock-items/colors', requireRole('Administrador'), listColors)

/**
 * GET /stock-items/package-types
 * Devuelve los tipos de empaque disponibles para los formularios de productos.
 */
router.get('/stock-items/package-types', requireRole('Administrador'), listPackageTypes)

/**
 * GET /stock-items/:stockItemID
 * Devuelve el detalle general de un producto.
 * Path param: stockItemID
 */
router.get('/stock-items/:stockItemID', requireRole('Administrador'), getStockItemById)

/**
 * GET /stock-items/:stockItemID/edit
 * Devuelve los datos editables de un producto.
 * Path param: stockItemID
 */
router.get('/stock-items/:stockItemID/edit', requireRole('Administrador'), getStockItemEditById)

/**
 * GET /stock-items/:stockItemID/groups
 * Devuelve los grupos asociados a un producto.
 * Path param: stockItemID
 */
router.get('/stock-items/:stockItemID/groups', requireRole('Administrador'), getStockItemGroupsById)

/**
 * PUT /stock-items/:stockItemID
 * Actualiza un producto, sus existencias y sus grupos.
 * Path param: stockItemID. Body: datos requeridos por Warehouse.UpdateStockItem.
 */
router.put('/stock-items/:stockItemID', requireRole('Administrador'), editStockItem)

/**
 * DELETE /stock-items/:stockItemID
 * Elimina un producto por su identificador.
 * Path param: stockItemID
 */
router.delete('/stock-items/:stockItemID', requireRole('Administrador'), removeStockItem)

export default router
