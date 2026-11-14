import { Router } from "express";
import {
  listStockItems,
  listStockGroups,
  listColors,
  listPackageTypes,
  getStockItemById,
  getStockItemEditById,
  getStockItemGroupsById,
  getStockItemHoldingsById,
  addStockItem,
  editStockItem,
  adjustStockItemHoldingsById,
  removeStockItem,
} from "../controllers/stockItemsController.js";
import { requireRole } from "../middleware/auth.js";
import { sqlErrors } from "../middleware/sqlErrors.js";
import {
  validateBody,
  validateParams,
  validatePagination,
  validateQuery,
} from "../middleware/validation.js";
import { idParams } from "../schemas/common.js";
import {
  catalogStockItemSchema,
  catalogStockItemUpdateSchema,
  stockItemHoldingsSchema,
  stockItemsQuery,
} from "../schemas/stockItems.js";

// Rutas de Productos.
const router = Router();

const stockItemParams = validateParams(idParams("stockItemID", "Producto"));
const invalidReferences = [
  400,
  "Alguna referencia del producto (proveedor, color, empaque o grupo) no existe",
];

/**
 * GET /stock-items
 * Devuelve una página de productos de la sucursal.
 * Query params: pageNumber, pageSize, stockItemName, stockGroupIDsJson
 * stockGroupIDsJson: arreglo JSON de IDs de grupos; null o [] incluye todos.
 */
router.get(
  "/stock-items",
  requireRole("Administrador"),
  validatePagination,
  validateQuery(stockItemsQuery),
  listStockItems,
  sqlErrors({
    50003: [
      400,
      "StockGroupIDsJson debe ser un arreglo JSON de IDs de categorías",
    ],
    50004: [400, "Los IDs de categorías deben ser números enteros positivos"],
    50005: [
      400,
      "Una o más categorías indicadas no existen en la base de datos",
    ],
  }),
);

/**
 * POST /stock-items
 * Inserta un producto en el catálogo central (Corporativo) con sus grupos.
 * Body: datos de catálogo, sin existencias. Responde { stockItemID, version }.
 */
router.post(
  "/stock-items",
  requireRole("Administrador"),
  validateBody(catalogStockItemSchema),
  addStockItem,
  sqlErrors({ 547: invalidReferences }),
);

/**
 * GET /stock-items/groups
 * Devuelve los grupos para inventario y filtros de reportes; admite ambos roles.
 */
router.get(
  "/stock-items/groups",
  requireRole("Administrador", "Corporativo"),
  listStockGroups,
);

/**
 * GET /stock-items/colors
 * Devuelve los colores disponibles para los formularios de productos.
 */
router.get("/stock-items/colors", requireRole("Administrador"), listColors);

/**
 * GET /stock-items/package-types
 * Devuelve los tipos de empaque disponibles para los formularios de productos.
 */
router.get(
  "/stock-items/package-types",
  requireRole("Administrador"),
  listPackageTypes,
);

/**
 * GET /stock-items/:stockItemID
 * Devuelve el detalle general de un producto en la sucursal.
 */
router.get(
  "/stock-items/:stockItemID",
  requireRole("Administrador"),
  stockItemParams,
  getStockItemById,
);

/**
 * GET /stock-items/:stockItemID/edit
 * Devuelve de Corporativo los datos editables del catálogo con Grupos y Version.
 */
router.get(
  "/stock-items/:stockItemID/edit",
  requireRole("Administrador"),
  stockItemParams,
  getStockItemEditById,
);

/**
 * GET /stock-items/:stockItemID/groups
 * Devuelve los grupos asociados a un producto en la sucursal.
 */
router.get(
  "/stock-items/:stockItemID/groups",
  requireRole("Administrador"),
  stockItemParams,
  getStockItemGroupsById,
);

/**
 * PUT /stock-items/:stockItemID
 * Actualiza un producto del catálogo central y reemplaza sus grupos.
 * Body: datos de catálogo y version. Responde { stockItemID, version }; 409 si la versión cambió.
 */
router.put(
  "/stock-items/:stockItemID",
  requireRole("Administrador"),
  stockItemParams,
  validateBody(catalogStockItemUpdateSchema),
  editStockItem,
  sqlErrors({
    53000: [404, "Producto no encontrado"],
    53003: [
      409,
      "El producto fue modificado por otro usuario. Recargue los datos antes de guardar",
    ],
    547: invalidReferences,
  }),
);

/**
 * GET /stock-items/:stockItemID/holdings
 * Devuelve las existencias del producto en la sucursal con su Version.
 */
router.get(
  "/stock-items/:stockItemID/holdings",
  requireRole("Administrador"),
  stockItemParams,
  getStockItemHoldingsById,
);

/**
 * PUT /stock-items/:stockItemID/holdings
 * Guarda los valores absolutos de las existencias del producto en la sucursal.
 * Body: existencias y version (null si todavía no hay fila). Responde { stockItemID, version }; 409 si cambió.
 */
router.put(
  "/stock-items/:stockItemID/holdings",
  requireRole("Administrador"),
  stockItemParams,
  validateBody(stockItemHoldingsSchema),
  adjustStockItemHoldingsById,
  sqlErrors({
    53000: [404, "El producto todavía no está disponible en esta sucursal"],
    53004: [
      409,
      "Las existencias fueron modificadas por otro usuario. Recargue los datos antes de guardar",
    ],
    547: [400, "El empleado indicado no existe"],
  }),
);

/**
 * DELETE /stock-items/:stockItemID
 * Elimina un producto en la sucursal.
 */
router.delete(
  "/stock-items/:stockItemID",
  requireRole("Administrador"),
  stockItemParams,
  removeStockItem,
  sqlErrors({
    53001: [404, "Producto no encontrado"],
    53002: [409, "El producto tiene ventas u órdenes asociadas"],
  }),
);

export default router;
