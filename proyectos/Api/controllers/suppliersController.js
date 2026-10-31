import { paginatedResponse } from '../helpers/paginatedResponse.js'
import { validateSupplier } from '../helpers/entityValidation.js'
import { getSupplierAddress, getSupplierCategories, getSupplierContacts, getSupplierDetail, getSupplierForEdit, getSuppliers, insertSupplier, updateSupplier, deleteSupplier } from '../services/suppliers.js'

/**
 * Obtiene una página de proveedores.
 * Permite filtrar opcionalmente por nombre, categoría y método de entrega.
 *
 * @param {import('express').Request} req Petición HTTP. Espera pageNumber, pageSize, supplierName, supplierCategoryID y deliveryMethodID en req.query.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con la página de proveedores.
 */
export async function listSuppliers(req, res) {
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
        const result = await getSuppliers(supplierName, supplierCategoryID, deliveryMethodID, pageNumber, pageSize)
        return paginatedResponse(res, pageNumber, pageSize, result)
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 52004) {
            return res.status(400).json({message: 'La categoría de proveedor indicada no existe.'})
        }
        if (sqlErrorCode === 52005) {
            return res.status(400).json({message: 'El método de entrega indicado no existe.'})
        }
        return res.status(500).json({message: 'Error al obtener proveedores'})
    }
}

/**
 * Obtiene todas las categorías de proveedor.
 * Se usa para llenar el combo de filtros de la lista de proveedores.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con las categorías de proveedor.
 */
export async function listSupplierCategories(req, res) {
    try {
        const categories = await getSupplierCategories()
        return res.json(categories)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener categorías de proveedor'})
    }
}

/**
 * Obtiene el detalle general de un proveedor por su identificador.
 * Incluye código de referencia, nombre, categoría, método de entrega,
 * días de gracia, teléfono, fax, sitio web y datos bancarios.
 *
 * @param {import('express').Request} req Petición HTTP. Espera supplierID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con el detalle del proveedor.
 */
export async function getSupplierById(req, res) {
    try {
        const supplierID = parseInt(req.params.supplierID, 10)
        const supplier = await getSupplierDetail(supplierID)
        if (supplier.length === 0) {
            return res.status(404).json({message: 'Proveedor no encontrado'})
        }
        return res.json(supplier)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener el proveedor'})
    }
}

/**
 * Obtiene los datos editables de un proveedor.
 *
 * @param {import('express').Request} req Petición con supplierID en la ruta.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Datos del formulario o 404.
 */
export async function getSupplierEditById(req, res) {
    try {
        const supplierID = parseInt(req.params.supplierID, 10)
        const suppliers = await getSupplierForEdit(supplierID)
        if (suppliers.length === 0) {
            return res.status(404).json({message: 'Proveedor no encontrado'})
        }
        return res.json(suppliers[0])
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener los datos editables del proveedor'})
    }
}

/**
 * Obtiene los contactos (principal y alternativo) de un proveedor por su identificador.
 * Devuelve nombre, teléfono, fax y correo de ambos contactos.
 *
 * @param {import('express').Request} req Petición HTTP. Espera supplierID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con los contactos del proveedor.
 */
export async function getSupplierContactsById(req, res) {
    try {
        const supplierID = parseInt(req.params.supplierID, 10)
        const contacts = await getSupplierContacts(supplierID)
        if (contacts.length === 0) {
            return res.status(404).json({message: 'Contactos del proveedor no encontrados'})
        }
        return res.json(contacts)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener los contactos del proveedor'})
    }
}

/**
 * Obtiene las direcciones de entrega y postal de un proveedor,
 * junto con su ubicación geográfica (latitud/longitud).
 *
 * @param {import('express').Request} req Petición HTTP. Espera supplierID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con las direcciones del proveedor.
 */
export async function getSupplierAddressById(req, res) {
    try {
        const supplierID = parseInt(req.params.supplierID, 10)
        const address = await getSupplierAddress(supplierID)
        if (address.length === 0) {
            return res.status(404).json({message: 'Dirección del proveedor no encontrada'})
        }
        return res.json(address)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener la dirección del proveedor'})
    }
}

/**
 * Elimina un proveedor por su identificador.
 * Devuelve 404 si no existe y 409 si tiene registros asociados.
 *
 * @param {import('express').Request} req Petición HTTP con supplierID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta sin contenido al eliminarlo.
 */
export async function removeSupplier(req, res) {
    const supplierID = Number(req.params.supplierID)
    try {
        await deleteSupplier(supplierID)
        return res.status(204).send()
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 52001) {
            return res.status(404).json({message: 'El proveedor indicado no existe.'})
        }
        if (sqlErrorCode === 52002) {
            return res.status(409).json({message: 'No se puede eliminar el proveedor porque tiene productos, órdenes de compra u otros registros asociados.'})
        }
        return res.status(500).json({message: 'Error al eliminar el proveedor'})
    }
}

/**
 * Crea un proveedor con los datos de req.body.
 *
 * @param {import('express').Request} req Petición HTTP con los datos del proveedor.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Identificador del proveedor creado.
 */
export async function addSupplier(req, res) {
    const supplier = req.body
    if (!supplier || typeof supplier !== 'object' || Array.isArray(supplier)) {
        return res.status(400).json({message: 'El cuerpo de la solicitud debe contener los datos del proveedor'})
    }
    const {fields, errors} = validateSupplier(supplier)
    if (fields.length > 0) {
        return res.status(400).json({message: `Datos inválidos del proveedor: ${errors[fields[0]]}`, fields, errors})
    }
    try {
        const supplierID = await insertSupplier(supplier)
        return res.status(201).json({supplierID})
    } catch (error) {
        if (Number(error.number) === 52003) {
            return res.status(400).json({message: 'LastEditedBy no corresponde a un empleado válido.'})
        }
        return res.status(500).json({message: 'Error al crear el proveedor'})
    }
}

/**
 * Actualiza completamente los datos editables de un proveedor.
 *
 * @param {import('express').Request} req Petición con supplierID en la ruta y datos en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Confirmación de la actualización.
 */
export async function editSupplier(req, res) {
    const supplierID = Number(req.params.supplierID)
    const supplier = req.body
    if (!supplier || typeof supplier !== 'object' || Array.isArray(supplier)) {
        return res.status(400).json({message: 'El cuerpo de la solicitud debe contener los datos del proveedor'})
    }
    const {fields, errors} = validateSupplier(supplier)
    if (fields.length > 0) {
        return res.status(400).json({message: `Datos inválidos del proveedor: ${errors[fields[0]]}`, fields, errors})
    }
    try {
        await updateSupplier(supplierID, supplier)
        return res.status(200).json({supplierID})
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 52000) {
            return res.status(404).json({message: 'El proveedor indicado no existe.'})
        }
        if (sqlErrorCode === 52003) {
            return res.status(400).json({message: 'LastEditedBy no corresponde a un empleado válido.'})
        }
        return res.status(500).json({message: 'Error al actualizar el proveedor'})
    }
}
