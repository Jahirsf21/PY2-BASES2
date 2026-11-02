import { Router } from 'express'
import { listSuppliers, listSupplierCategories, getSupplierById, getSupplierEditById, getSupplierContactsById, getSupplierAddressById, removeSupplier, addSupplier, editSupplier } from '../controllers/suppliersController.js'
import { requireRole } from '../middleware/auth.js'

// Rutas de Proveedores.
const router = Router()

/**
 * GET /suppliers
 * Devuelve una página de proveedores paginada.
 * Query params: pageNumber, pageSize, supplierName, supplierCategoryID, deliveryMethodID
 */
router.get('/suppliers', requireRole('Administrador'), listSuppliers)

/**
 * POST /suppliers
 * Crea un proveedor y devuelve su identificador.
 * Body: datos requeridos por Purchasing.InsertSupplier.
 */
router.post('/suppliers', requireRole('Administrador'), addSupplier)

/**
 * GET /suppliers/categories
 * Devuelve todas las categorías de proveedor para el combo de filtros.
 */
router.get('/suppliers/categories', requireRole('Administrador'), listSupplierCategories)

/**
 * GET /suppliers/:supplierID
 * Devuelve el detalle general de un proveedor.
 * Path param: supplierID
 */
router.get('/suppliers/:supplierID', requireRole('Administrador'), getSupplierById)

/** GET /suppliers/:supplierID/edit: precarga todos los datos editables. */
router.get('/suppliers/:supplierID/edit', requireRole('Administrador'), getSupplierEditById)

/**
 * PUT /suppliers/:supplierID
 * Actualiza todos los datos editables de un proveedor.
 * Path param: supplierID. Body: campos requeridos por Purchasing.UpdateSupplier.
 */
router.put('/suppliers/:supplierID', requireRole('Administrador'), editSupplier)

/**
 * DELETE /suppliers/:supplierID
 * Elimina un proveedor si no tiene registros asociados.
 * Path param: supplierID
 */
router.delete('/suppliers/:supplierID', requireRole('Administrador'), removeSupplier)

/**
 * GET /suppliers/:supplierID/contacts
 * Devuelve los contactos (principal y alternativo) de un proveedor.
 * Path param: supplierID
 */
router.get('/suppliers/:supplierID/contacts', requireRole('Administrador'), getSupplierContactsById)

/**
 * GET /suppliers/:supplierID/address
 * Devuelve las direcciones de entrega y postal de un proveedor, con latitud/longitud.
 * Path param: supplierID
 */
router.get('/suppliers/:supplierID/address', requireRole('Administrador'), getSupplierAddressById)

export default router
