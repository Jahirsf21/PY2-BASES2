import { paginatedResponse } from '../helpers/paginatedResponse.js'
// import { validateCustomer } from '../helpers/entityValidation.js'
// import { getBillToCustomers, getBuyingGroups, getCustomerAddress, getCustomerCategories, getCustomerContacts, getCustomerDetail, getCustomerForEdit, getCustomers, insertCustomer, deleteCustomer, updateCustomer } from '../services/customers.js'
import { getBillToCustomers, getCustomerAddress, getCustomerCategories, getCustomerContacts, getCustomerDetail, getCustomerPrivateDetail, getCustomers } from '../services/customers.js'

/**
 * Obtiene una página de clientes.
 * Permite filtrar opcionalmente por nombre, categoría y método de entrega.
 *
 * @param {import('express').Request} req Petición HTTP. Espera pageNumber, pageSize, customerName, customerCategoryID y deliveryMethodID en req.query; usa identidad y sucursal del JWT en req.user.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con la página de clientes.
 */
export async function listCustomers(req, res, next) {
    try {
        const {pageNumber, pageSize} = res.locals.pagination
        const customerName = req.query.customerName
        const customerCategoryID = req.query.customerCategoryID
        const deliveryMethodID = req.query.deliveryMethodID
        const result = await getCustomers(customerName, customerCategoryID, deliveryMethodID, pageNumber, pageSize, req.user.userID, req.user.node)
        return paginatedResponse(res, pageNumber, pageSize, result)
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 51003) {
            return res.status(400).json({message: 'La categoría de cliente indicada no existe'})
        }
        if (sqlErrorCode === 51004) {
            return res.status(400).json({message: 'El método de entrega indicado no existe'})
        }
        return next(error)
    }
}

/**
 * Obtiene una página de clientes (ID y nombre) para usar como "cliente por facturar" (BillToCustomerID).
 * Permite filtrar opcionalmente por nombre de cliente.
 *
 * @param {import('express').Request} req Petición HTTP. Espera pageNumber, pageSize y customerName en req.query; usa identidad y sucursal del JWT en req.user.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con la página de clientes.
 */
export async function listBillToCustomers(req, res, next) {
    try {
        const {pageNumber, pageSize} = res.locals.pagination
        const customerName = req.query.customerName
        const result = await getBillToCustomers(customerName, pageNumber, pageSize, req.user.userID, req.user.node)
        return paginatedResponse(res, pageNumber, pageSize, result)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene todas las categorías de cliente.
 * Se usa para llenar el combo de filtros de la lista de clientes.
 *
 * @param {import('express').Request} req Petición HTTP con identidad y sucursal del JWT en req.user.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con las categorías.
 */
export async function listCustomerCategories(req, res, next) {
    try {
        const categories = await getCustomerCategories(req.user.userID, req.user.node)
        return res.json(categories)
    } catch (error) {
        return next(error)
    }
}

// /**
//  * Obtiene todas las agrupaciones de compra (buying groups).
//  * Se usa para llenar el combo de buying group en el formulario de cliente.
//  *
//  * @param {import('express').Request} req Petición HTTP con identidad y sucursal del JWT en req.user.
//  * @param {import('express').Response} res Respuesta HTTP.
//  * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
//  * @returns {Promise<import('express').Response|void>} Respuesta JSON con los buying groups.
//  */
// export async function listBuyingGroups(req, res, next) {
//     try {
//         const groups = await getBuyingGroups(req.user.userID, req.user.node)
//         return res.json(groups)
//     } catch (error) {
//         return next(error)
//     }
// }

/**
 * Obtiene el detalle general de un cliente por su identificador.
 * Incluye nombre, categoría, grupo de compra, nombre del cliente por facturar,
 * método de entrega y días de gracia.
 *
 * @param {import('express').Request} req Petición HTTP. Espera customerID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con el detalle del cliente.
 */
export async function getCustomerById(req, res, next) {
    try {
        const customerID = parseInt(req.params.customerID, 10)
        const customer = await getCustomerDetail(customerID, req.user.userID, req.user.node)
        if (customer.length === 0) {
            return res.status(404).json({message: 'Cliente no encontrado'})
        }
        return res.json(customer)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene el sitio web privado de un cliente por su identificador.
 *
 * @param {import('express').Request} req Petición HTTP. Espera customerID en req.params; usa identidad y sucursal del JWT en req.user.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con los datos privados del cliente.
 */
export async function getCustomerPrivateById(req, res, next) {
    try {
        const customerID = parseInt(req.params.customerID, 10)
        const details = await getCustomerPrivateDetail(customerID, req.user.userID, req.user.node)
        if (details.length === 0) {
            return res.status(404).json({message: 'Datos privados del cliente no encontrados'})
        }
        return res.json(details)
    } catch (error) {
        return next(error)
    }
}

// /**
//  * Obtiene los datos editables de un cliente.
//  *
//  * @param {import('express').Request} req Petición con customerID en la ruta.
//  * @param {import('express').Response} res Respuesta HTTP.
//  * @returns {Promise<import('express').Response>} Datos del formulario o 404.
//  */
// export async function getCustomerEditById(req, res, next) {
//     try {
//         const customerID = parseInt(req.params.customerID, 10)
//         const customer = await getCustomerForEdit(customerID, req.user.userID, req.user.node)
//         if (customer.length === 0) {
//             return res.status(404).json({message: 'Cliente no encontrado'})
//         }
//         return res.json(customer[0])
//     } catch (error) {
//         return next(error)
//     }
// }

/**
 * Obtiene los contactos (principal y alternativo) de un cliente por su identificador.
 * Devuelve nombre, teléfono, fax y correo de ambos contactos.
 *
 * @param {import('express').Request} req Petición HTTP. Espera customerID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con los contactos del cliente.
 */
export async function getCustomerContactsById(req, res, next) {
    try {
        const customerID = parseInt(req.params.customerID, 10)
        const contacts = await getCustomerContacts(customerID, req.user.userID, req.user.node)
        if (contacts.length === 0) {
            return res.status(404).json({message: 'Contactos no encontrados'})
        }
        return res.json(contacts)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene las direcciones de entrega y postal de un cliente,
 * junto con su ubicación geográfica (latitud/longitud).
 *
 * @param {import('express').Request} req Petición HTTP. Espera customerID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con las direcciones del cliente.
 */
export async function getCustomerAddressById(req, res, next) {
    try {
        const customerID = parseInt(req.params.customerID, 10)
        const address = await getCustomerAddress(customerID, req.user.userID, req.user.node)
        if (address.length === 0) {
            return res.status(404).json({message: 'Direccion no encontrada'})
        }
        return res.json(address)
    } catch (error) {
        return next(error)
    }
}

// /**
//  * Crea un cliente con los datos del cuerpo de la solicitud.
//  * Devuelve 201 con el identificador creado o 400 si faltan campos obligatorios.
//  *
//  * @param {import('express').Request} req Petición HTTP con los datos del cliente en req.body.
//  * @param {import('express').Response} res Respuesta HTTP.
//  * @returns {Promise<import('express').Response>} Respuesta con el CustomerID creado.
//  */
// export async function addCustomer(req, res, next) {
//     const customer = req.body
//     if (!customer || typeof customer !== 'object' || Array.isArray(customer)) {
//         return res.status(400).json({message: 'El cuerpo de la solicitud debe contener los datos del cliente'})
//     }
//     const {fields, errors} = validateCustomer(customer)
//     if (fields.length > 0) {
//         return res.status(400).json({
//             message: `Datos inválidos del cliente: ${errors[fields[0]]}`,
//             fields,
//             errors,
//         })
//     }
//     try {
//         const customerID = await insertCustomer(
//             customer.customerName,
//             customer.customerCategoryID,
//             customer.billToCustomerID ?? null,
//             customer.lastEditedBy,
//             customer.standardDiscountPercentage ?? 0,
//             customer.creditLimit ?? null,
//             customer.isStatementSent ?? false,
//             customer.isOnCreditHold ?? false,
//             customer.buyingGroupID ?? null,
//             customer.primaryContactPersonID,
//             customer.alternateContactPersonID ?? null,
//             customer.deliveryMethodID,
//             customer.paymentDays,
//             customer.phoneNumber,
//             customer.faxNumber ?? null,
//             customer.websiteURL ?? null,
//             customer.deliveryAddressLine1,
//             customer.deliveryAddressLine2 ?? null,
//             customer.deliveryCityID,
//             customer.deliveryPostalCode,
//             customer.postalAddressLine1,
//             customer.postalAddressLine2 ?? null,
//             customer.latitude ?? null,
//             customer.longitude ?? null,
//             req.user.userID,
//             req.user.node,
//         )
//         return res.status(201).json(customerID)
//     } catch (error) {
//         const sqlErrorCode = Number(error.number)
//         if (sqlErrorCode === 51002) {
//             return res.status(400).json({message: 'LastEditedBy no corresponde a un empleado válido.'})
//         }
//         return next(error)
//     }
// }
//
// /**
//  * Elimina un cliente por su identificador.
//  * Devuelve 404 si no existe y 409 si tiene registros asociados.
//  *
//  * @param {import('express').Request} req Petición HTTP con customerID en req.params.
//  * @param {import('express').Response} res Respuesta HTTP.
//  * @returns {Promise<import('express').Response>} Respuesta sin contenido al eliminarlo.
//  */
// export async function removeCustomer(req, res, next) {
//     const customerID = Number(req.params.customerID)
//     try {
//         await deleteCustomer(customerID, req.user.userID, req.user.node)
//         return res.status(204).send()
//     } catch (error) {
//         const sqlErrorCode = Number(error.number)
//         if (sqlErrorCode === 51000) {
//             return res.status(404).json({message: 'El cliente indicado no existe.'})
//         }
//         if (sqlErrorCode === 51001) {
//             return res.status(409).json({message: 'No se puede eliminar el cliente porque tiene facturas u otros registros asociados.'})
//         }
//         return next(error)
//     }
// }
//
// /**
//  * Actualiza completamente los datos de un cliente.
//  * Devuelve 400 ante datos inválidos, 404 si no existe y 200 al actualizarlo.
//  *
//  * @param {import('express').Request} req Petición con customerID en la ruta y datos en req.body.
//  * @param {import('express').Response} res Respuesta HTTP.
//  * @returns {Promise<import('express').Response>} Confirmación de la actualización.
//  */
// export async function editCustomer(req, res, next) {
//     const customerID = Number(req.params.customerID)
//     const customer = req.body
//     if (!customer || typeof customer !== 'object' || Array.isArray(customer)) {
//         return res.status(400).json({message: 'El cuerpo de la solicitud debe contener los datos del cliente'})
//     }
//     const {fields, errors} = validateCustomer(customer, true)
//     if (fields.length > 0) {
//         return res.status(400).json({message: `Datos inválidos del cliente: ${errors[fields[0]]}`, fields, errors})
//     }
//     try {
//         await updateCustomer(
//             customerID,
//             customer.customerName,
//             customer.customerCategoryID,
//             customer.billToCustomerID,
//             customer.lastEditedBy,
//             customer.standardDiscountPercentage ?? 0,
//             customer.creditLimit ?? null,
//             customer.isStatementSent ?? false,
//             customer.isOnCreditHold ?? false,
//             customer.buyingGroupID ?? null,
//             customer.primaryContactPersonID,
//             customer.alternateContactPersonID ?? null,
//             customer.deliveryMethodID,
//             customer.paymentDays,
//             customer.phoneNumber,
//             customer.faxNumber ?? null,
//             customer.websiteURL ?? null,
//             customer.deliveryAddressLine1,
//             customer.deliveryAddressLine2 ?? null,
//             customer.deliveryCityID,
//             customer.deliveryPostalCode,
//             customer.postalAddressLine1,
//             customer.postalAddressLine2 ?? null,
//             customer.latitude ?? null,
//             customer.longitude ?? null,
//             req.user.userID,
//             req.user.node,
//         )
//         return res.status(200).json({customerID})
//     } catch (error) {
//         const sqlErrorCode = Number(error.number)
//         if (sqlErrorCode === 51000) {
//             return res.status(404).json({message: 'El cliente indicado no existe.'})
//         }
//         if (sqlErrorCode === 51002) {
//             return res.status(400).json({message: 'LastEditedBy no corresponde a un empleado válido.'})
//         }
//         return next(error)
//     }
// }
