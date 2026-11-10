import { paginatedResponse } from '../helpers/paginatedResponse.js'
// import { validateSupplier } from '../helpers/entityValidation.js'
// import { getSupplierAddress, getSupplierCategories, getSupplierContacts, getSupplierDetail, getSupplierForEdit, getSuppliers, insertSupplier, updateSupplier, deleteSupplier } from '../services/suppliers.js'
import { getSupplierAddress, getSupplierCategories, getSupplierContacts, getSupplierDetail, getSupplierPrivateDetail, getSuppliers } from '../services/suppliers.js'

/**
 * Obtiene una página de proveedores.
 * Permite filtrar opcionalmente por nombre, categoría y método de entrega.
 *
 * @param {import('express').Request} req Petición HTTP. Espera pageNumber, pageSize, supplierName, supplierCategoryID y deliveryMethodID en req.query.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con la página de proveedores.
 */
export async function listSuppliers(req, res, next) {
    try {
        const pageNumber = Number(req.query.pageNumber)
        const pageSize = Number(req.query.pageSize)
        if (!Number.isInteger(pageNumber) || !Number.isInteger(pageSize) || pageNumber < 1 || pageSize < 1) {
            return res.status(400).json({message: 'pageNumber y pageSize deben ser enteros mayores a 0'})
        }
        if (pageSize > 100) {
            return res.status(400).json({message: 'pageSize no puede ser mayor a 100'})
        }
        const supplierName = req.query.supplierName
        const supplierCategoryID = req.query.supplierCategoryID
        const deliveryMethodID = req.query.deliveryMethodID
        const result = await getSuppliers(supplierName, supplierCategoryID, deliveryMethodID, pageNumber, pageSize, req.user.userID, req.user.node)
        return paginatedResponse(res, pageNumber, pageSize, result)
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 52004) {
            return res.status(400).json({message: 'La categoría de proveedor indicada no existe'})
        }
        if (sqlErrorCode === 52005) {
            return res.status(400).json({message: 'El método de entrega indicado no existe'})
        }
        return next(error)
    }
}

/**
 * Obtiene todas las categorías de proveedor.
 * Se usa para llenar el combo de filtros de la lista de proveedores.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con las categorías de proveedor.
 */
export async function listSupplierCategories(req, res, next) {
    try {
        const categories = await getSupplierCategories(req.user.userID, req.user.node)
        return res.json(categories)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene el detalle general de un proveedor por su identificador.
 * Incluye nombre, categoría, método de entrega y días de gracia.
 *
 * @param {import('express').Request} req Petición HTTP. Espera supplierID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con el detalle del proveedor.
 */
export async function getSupplierById(req, res, next) {
    try {
        const supplierID = parseInt(req.params.supplierID, 10)
        const supplier = await getSupplierDetail(supplierID, req.user.userID, req.user.node)
        if (supplier.length === 0) {
            return res.status(404).json({message: 'Proveedor no encontrado'})
        }
        return res.json(supplier)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene la referencia, los datos de contacto y la banca de un proveedor por su identificador.
 *
 * @param {import('express').Request} req Petición HTTP. Espera supplierID en req.params; usa identidad y sucursal del JWT en req.user.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con los datos privados del proveedor.
 */
export async function getSupplierPrivateById(req, res, next) {
    try {
        const supplierID = parseInt(req.params.supplierID, 10)
        const details = await getSupplierPrivateDetail(supplierID, req.user.userID, req.user.node)
        if (details.length === 0) {
            return res.status(404).json({message: 'Datos privados del proveedor no encontrados'})
        }
        return res.json(details)
    } catch (error) {
        return next(error)
    }
}

// /**
//  * Obtiene los datos editables de un proveedor.
//  *
//  * @param {import('express').Request} req Petición con supplierID en la ruta.
//  * @param {import('express').Response} res Respuesta HTTP.
//  * @returns {Promise<import('express').Response>} Datos del formulario o 404.
//  */
// export async function getSupplierEditById(req, res, next) {
//     try {
//         const supplierID = parseInt(req.params.supplierID, 10)
//         const suppliers = await getSupplierForEdit(supplierID, req.user.userID, req.user.node)
//         if (suppliers.length === 0) {
//             return res.status(404).json({message: 'Proveedor no encontrado'})
//         }
//         return res.json(suppliers[0])
//     } catch (error) {
//         return next(error)
//     }
// }

/**
 * Obtiene los contactos (principal y alternativo) de un proveedor por su identificador.
 * Devuelve nombre, teléfono, fax y correo de ambos contactos.
 *
 * @param {import('express').Request} req Petición HTTP. Espera supplierID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con los contactos del proveedor.
 */
export async function getSupplierContactsById(req, res, next) {
    try {
        const supplierID = parseInt(req.params.supplierID, 10)
        const contacts = await getSupplierContacts(supplierID, req.user.userID, req.user.node)
        if (contacts.length === 0) {
            return res.status(404).json({message: 'Contactos del proveedor no encontrados'})
        }
        return res.json(contacts)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene las direcciones de entrega y postal de un proveedor,
 * junto con su ubicación geográfica (latitud/longitud).
 *
 * @param {import('express').Request} req Petición HTTP. Espera supplierID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con las direcciones del proveedor.
 */
export async function getSupplierAddressById(req, res, next) {
    try {
        const supplierID = parseInt(req.params.supplierID, 10)
        const address = await getSupplierAddress(supplierID, req.user.userID, req.user.node)
        if (address.length === 0) {
            return res.status(404).json({message: 'Dirección del proveedor no encontrada'})
        }
        return res.json(address)
    } catch (error) {
        return next(error)
    }
}

// /**
//  * Elimina un proveedor por su identificador.
//  * Devuelve 404 si no existe y 409 si tiene registros asociados.
//  *
//  * @param {import('express').Request} req Petición HTTP con supplierID en req.params.
//  * @param {import('express').Response} res Respuesta HTTP.
//  * @returns {Promise<import('express').Response>} Respuesta sin contenido al eliminarlo.
//  */
// export async function removeSupplier(req, res, next) {
//     const supplierID = Number(req.params.supplierID)
//     try {
//         await deleteSupplier(supplierID, req.user.userID, req.user.node)
//         return res.status(204).send()
//     } catch (error) {
//         const sqlErrorCode = Number(error.number)
//         if (sqlErrorCode === 52001) {
//             return res.status(404).json({message: 'El proveedor indicado no existe.'})
//         }
//         if (sqlErrorCode === 52002) {
//             return res.status(409).json({message: 'No se puede eliminar el proveedor porque tiene productos, órdenes de compra u otros registros asociados.'})
//         }
//         return next(error)
//     }
// }
//
// /**
//  * Crea un proveedor con los datos de req.body.
//  *
//  * @param {import('express').Request} req Petición HTTP con los datos del proveedor.
//  * @param {import('express').Response} res Respuesta HTTP.
//  * @returns {Promise<import('express').Response>} Identificador del proveedor creado.
//  */
// export async function addSupplier(req, res, next) {
//     const supplier = req.body
//     if (!supplier || typeof supplier !== 'object' || Array.isArray(supplier)) {
//         return res.status(400).json({message: 'El cuerpo de la solicitud debe contener los datos del proveedor'})
//     }
//     const {fields, errors} = validateSupplier(supplier)
//     if (fields.length > 0) {
//         return res.status(400).json({message: `Datos inválidos del proveedor: ${errors[fields[0]]}`, fields, errors})
//     }
//     try {
//         const supplierID = await insertSupplier(supplier, req.user.userID, req.user.node)
//         return res.status(201).json({supplierID})
//     } catch (error) {
//         if (Number(error.number) === 52003) {
//             return res.status(400).json({message: 'LastEditedBy no corresponde a un empleado válido.'})
//         }
//         return next(error)
//     }
// }
//
// /**
//  * Actualiza completamente los datos editables de un proveedor.
//  *
//  * @param {import('express').Request} req Petición con supplierID en la ruta y datos en req.body.
//  * @param {import('express').Response} res Respuesta HTTP.
//  * @returns {Promise<import('express').Response>} Confirmación de la actualización.
//  */
// export async function editSupplier(req, res, next) {
//     const supplierID = Number(req.params.supplierID)
//     const supplier = req.body
//     if (!supplier || typeof supplier !== 'object' || Array.isArray(supplier)) {
//         return res.status(400).json({message: 'El cuerpo de la solicitud debe contener los datos del proveedor'})
//     }
//     const {fields, errors} = validateSupplier(supplier)
//     if (fields.length > 0) {
//         return res.status(400).json({message: `Datos inválidos del proveedor: ${errors[fields[0]]}`, fields, errors})
//     }
//     try {
//         await updateSupplier(supplierID, supplier, req.user.userID, req.user.node)
//         return res.status(200).json({supplierID})
//     } catch (error) {
//         const sqlErrorCode = Number(error.number)
//         if (sqlErrorCode === 52000) {
//             return res.status(404).json({message: 'El proveedor indicado no existe.'})
//         }
//         if (sqlErrorCode === 52003) {
//             return res.status(400).json({message: 'LastEditedBy no corresponde a un empleado válido.'})
//         }
//         return next(error)
//     }
// }
