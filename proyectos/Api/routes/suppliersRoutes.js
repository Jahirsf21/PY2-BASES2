import { Router } from "express";
// import { listSuppliers, listSupplierCategories, getSupplierById, getSupplierEditById, getSupplierContactsById, getSupplierAddressById, removeSupplier, addSupplier, editSupplier } from '../controllers/suppliersController.js'
import {
  listSuppliers,
  listSupplierCategories,
  getSupplierById,
  getSupplierPrivateById,
  getSupplierContactsById,
  getSupplierAddressById,
} from "../controllers/suppliersController.js";
import { requireRole } from "../middleware/auth.js";
import {
  validateParams,
  validatePagination,
} from "../middleware/validation.js";
import { idParams } from "../schemas/common.js";

// Rutas de Proveedores.
const router = Router();

/**
 * GET /suppliers
 * Devuelve una página de proveedores paginada.
 * Query params: pageNumber, pageSize, supplierName, supplierCategoryID, deliveryMethodID
 */
router.get(
  "/suppliers",
  requireRole("Administrador"),
  validatePagination,
  listSuppliers,
);

// /**
//  * POST /suppliers
//  * Crea un proveedor y devuelve su identificador.
//  * Body: datos requeridos por Purchasing.InsertSupplier.
//  */
// router.post('/suppliers', requireRole('Administrador'), addSupplier)

/**
 * GET /suppliers/categories
 * Devuelve todas las categorías de proveedor para el combo de filtros.
 */
router.get(
  "/suppliers/categories",
  requireRole("Administrador"),
  listSupplierCategories,
);

/**
 * GET /suppliers/:supplierID
 * Devuelve el detalle general de un proveedor.
 * Path param: supplierID
 */
router.get(
  "/suppliers/:supplierID",
  requireRole("Administrador"),
  validateParams(idParams("supplierID", "Proveedor")),
  getSupplierById,
);

/**
 * GET /suppliers/:supplierID/private
 * Devuelve la referencia, los datos de contacto y la banca del proveedor desde Corporativo.
 * Path param: supplierID
 */
router.get(
  "/suppliers/:supplierID/private",
  requireRole("Administrador"),
  validateParams(idParams("supplierID", "Proveedor")),
  getSupplierPrivateById,
);

// /** GET /suppliers/:supplierID/edit: precarga todos los datos editables. */
// router.get('/suppliers/:supplierID/edit', requireRole('Administrador'), getSupplierEditById)
//
// /**
//  * PUT /suppliers/:supplierID
//  * Actualiza todos los datos editables de un proveedor.
//  * Path param: supplierID. Body: campos requeridos por Purchasing.UpdateSupplier.
//  */
// router.put('/suppliers/:supplierID', requireRole('Administrador'), editSupplier)
//
// /**
//  * DELETE /suppliers/:supplierID
//  * Elimina un proveedor si no tiene registros asociados.
//  * Path param: supplierID
//  */
// router.delete('/suppliers/:supplierID', requireRole('Administrador'), removeSupplier)

/**
 * GET /suppliers/:supplierID/contacts
 * Devuelve los contactos (principal y alternativo) de un proveedor, con datos privados de Corporativo.
 * Path param: supplierID
 */
router.get(
  "/suppliers/:supplierID/contacts",
  requireRole("Administrador"),
  validateParams(idParams("supplierID", "Proveedor")),
  getSupplierContactsById,
);

/**
 * GET /suppliers/:supplierID/address
 * Devuelve las direcciones de entrega y postal de un proveedor desde Corporativo, con latitud/longitud.
 * Path param: supplierID
 */
router.get(
  "/suppliers/:supplierID/address",
  requireRole("Administrador"),
  validateParams(idParams("supplierID", "Proveedor")),
  getSupplierAddressById,
);

export default router;
