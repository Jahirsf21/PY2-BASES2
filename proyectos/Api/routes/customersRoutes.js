import { Router } from 'express'
import { listCustomers, listBillToCustomers, listCustomerCategories, listBuyingGroups, getCustomerById, getCustomerEditById, getCustomerContactsById, getCustomerAddressById, addCustomer, removeCustomer, editCustomer } from '../controllers/customersController.js'

// Rutas de Clientes.
const router = Router()

/**
 * GET /customers
 * Devuelve una página de clientes paginada.
 * Query params: pageNumber, pageSize, customerName, customerCategoryID, deliveryMethodID
 */
router.get('/customers', listCustomers)

/**
 * POST /customers
 * Crea un cliente y devuelve su identificador.
 * Body: datos del cliente requeridos por Sales.InsertCustomer.
 */
router.post('/customers', addCustomer)

/**
 * GET /customers/bill-to
 * Devuelve una página de clientes (ID y nombre) para usar como "cliente por facturar" (BillToCustomerID).
 * Query params: pageNumber, pageSize, customerName
 */
router.get('/customers/bill-to', listBillToCustomers)

/**
 * GET /customers/categories
 * Devuelve todas las categorías de cliente para el combo de filtros.
 */
router.get('/customers/categories', listCustomerCategories)

/**
 * GET /customers/buying-groups
 * Devuelve todas las agrupaciones de compra para el combo del formulario.
 */
router.get('/customers/buying-groups', listBuyingGroups)

/**
 * GET /customers/:customerID
 * Devuelve el detalle general de un cliente.
 * Path param: customerID
 */
router.get('/customers/:customerID', getCustomerById)

/**
 * GET /customers/:customerID/edit
 * Obtiene los datos editables y referencias del cliente.
 */
router.get('/customers/:customerID/edit', getCustomerEditById)
/**
 * PUT /customers/:customerID
 * Actualiza todos los datos editables de un cliente.
 * Path param: customerID. Body: campos requeridos por Sales.UpdateCustomer.
 */
router.put('/customers/:customerID', editCustomer)

/**
 * DELETE /customers/:customerID
 * Elimina un cliente si no tiene registros asociados.
 * Path param: customerID
 */
router.delete('/customers/:customerID', removeCustomer)

/**
 * GET /customers/:customerID/contacts
 * Devuelve los contactos (principal y alternativo) de un cliente.
 * Path param: customerID
 */
router.get('/customers/:customerID/contacts', getCustomerContactsById)

/**
 * GET /customers/:customerID/address
 * Devuelve las direcciones de entrega y postal de un cliente, con latitud/longitud.
 * Path param: customerID
 */
router.get('/customers/:customerID/address', getCustomerAddressById)

export default router
