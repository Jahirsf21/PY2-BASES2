import { Router } from 'express'
import { listSuppliers, listSupplierCategories, getSupplierById, getSupplierEditById, getSupplierContactsById, getSupplierAddressById, removeSupplier, addSupplier, editSupplier } from '../controllers/suppliersController.js'

// Rutas de Proveedores.
const router = Router()

/**
 * GET /suppliers
 * Devuelve una página de proveedores paginada.
 * Query params: pageNumber, pageSize, supplierName, supplierCategoryID, deliveryMethodID
 */
router.get('/suppliers', listSuppliers)

/**
 * POST /suppliers
 * Crea un proveedor y devuelve su identificador.
 * Body: datos requeridos por Purchasing.InsertSupplier.
 */
router.post('/suppliers', addSupplier)

/**
 * GET /suppliers/categories
 * Devuelve todas las categorías de proveedor para el combo de filtros.
 */
router.get('/suppliers/categories', listSupplierCategories)

/**
 * GET /suppliers/:supplierID
 * Devuelve el detalle general de un proveedor.
 * Path param: supplierID
 */
router.get('/suppliers/:supplierID', getSupplierById)

/** GET /suppliers/:supplierID/edit: precarga todos los datos editables. */
router.get('/suppliers/:supplierID/edit', getSupplierEditById)

/**
 * PUT /suppliers/:supplierID
 * Actualiza todos los datos editables de un proveedor.
 * Path param: supplierID. Body: campos requeridos por Purchasing.UpdateSupplier.
 */
router.put('/suppliers/:supplierID', editSupplier)

/**
 * DELETE /suppliers/:supplierID
 * Elimina un proveedor si no tiene registros asociados.
 * Path param: supplierID
 */
router.delete('/suppliers/:supplierID', removeSupplier)

/**
 * GET /suppliers/:supplierID/contacts
 * Devuelve los contactos (principal y alternativo) de un proveedor.
 * Path param: supplierID
 */
router.get('/suppliers/:supplierID/contacts', getSupplierContactsById)

/**
 * GET /suppliers/:supplierID/address
 * Devuelve las direcciones de entrega y postal de un proveedor, con latitud/longitud.
 * Path param: supplierID
 */
router.get('/suppliers/:supplierID/address', getSupplierAddressById)

export default router
