import { paginatedResponse } from '../helpers/paginatedResponse.js'
import { validateCustomer } from '../helpers/entityValidation.js'
import { getBillToCustomers, getBuyingGroups, getCustomerAddress, getCustomerCategories, getCustomerContacts, getCustomerDetail, getCustomerForEdit, getCustomers, insertCustomer, deleteCustomer, updateCustomer } from '../services/customers.js'

/**
 * Obtiene una página de clientes.
 * Permite filtrar opcionalmente por nombre, categoría y método de entrega.
 *
 * @param {import('express').Request} req Petición HTTP. Espera pageNumber, pageSize, customerName, customerCategoryID y deliveryMethodID en req.query.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con la página de clientes.
 */
export async function listCustomers(req, res) {
    try {
        const pageNumber = Number(req.query.pageNumber)
        const pageSize = Number(req.query.pageSize)
        if (!Number.isInteger(pageNumber) || !Number.isInteger(pageSize) || pageNumber < 1 || pageSize < 1) {
            return res.status(400).json({message: 'pageNumber y pageSize deben ser enteros mayores a 0'})
        }
        if (pageSize > 100) {
            return res.status(400).json({message: 'pageSize no puede ser mayor a 100'})
        }
        const customerName = req.query.customerName
        const customerCategoryID = req.query.customerCategoryID
        const deliveryMethodID = req.query.deliveryMethodID
        const result = await getCustomers(customerName, customerCategoryID, deliveryMethodID, pageNumber, pageSize)
        return paginatedResponse(res, pageNumber, pageSize, result)
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 51003) {
            return res.status(400).json({message: 'La categoría de cliente indicada no existe.'})
        }
        if (sqlErrorCode === 51004) {
            return res.status(400).json({message: 'El método de entrega indicado no existe.'})
        }
        return res.status(500).json({message: 'Error al obtener clientes'})
    }
}

/**
 * Obtiene una página de clientes (ID y nombre) para usar como "cliente por facturar" (BillToCustomerID).
 * Permite filtrar opcionalmente por nombre de cliente.
 *
 * @param {import('express').Request} req Petición HTTP. Espera pageNumber, pageSize y customerName en req.query.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con la página de clientes.
 */
export async function listBillToCustomers(req, res) {
    try {
        const pageNumber = Number(req.query.pageNumber)
        const pageSize = Number(req.query.pageSize)
        if (!Number.isInteger(pageNumber) || !Number.isInteger(pageSize) || pageNumber < 1 || pageSize < 1) {
            return res.status(400).json({message: 'pageNumber y pageSize deben ser enteros mayores a 0'})
        }
        if (pageSize > 100) {
            return res.status(400).json({message: 'pageSize no puede ser mayor a 100'})
        }
        const customerName = req.query.customerName
        const result = await getBillToCustomers(customerName, pageNumber, pageSize)
        return paginatedResponse(res, pageNumber, pageSize, result)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener clientes para facturar'})
    }
}

/**
 * Obtiene todas las categorías de cliente.
 * Se usa para llenar el combo de filtros de la lista de clientes.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con las categorías.
 */
export async function listCustomerCategories(req, res) {
    try {
        const categories = await getCustomerCategories()
        return res.json(categories)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener categorías de cliente'})
    }
}

/**
 * Obtiene todas las agrupaciones de compra (buying groups).
 * Se usa para llenar el combo de buying group en el formulario de cliente.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con los buying groups.
 */
export async function listBuyingGroups(req, res) {
    try {
        const groups = await getBuyingGroups()
        return res.json(groups)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener los grupos de compra'})
    }
}

/**
 * Obtiene el detalle general de un cliente por su identificador.
 * Incluye nombre, categoría, grupo de compra, nombre del cliente por facturar,
 * método de entrega, días de gracia y sitio web.
 *
 * @param {import('express').Request} req Petición HTTP. Espera customerID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con el detalle del cliente.
 */
export async function getCustomerById(req, res) {
    try {
        const customerID = parseInt(req.params.customerID, 10)
        const customer = await getCustomerDetail(customerID)
        if (customer.length === 0) {
            return res.status(404).json({message: 'Cliente no encontrado'})
        }
        return res.json(customer)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener al cliente'})
    }
}

/**
 * Obtiene los datos editables de un cliente.
 *
 * @param {import('express').Request} req Petición con customerID en la ruta.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Datos del formulario o 404.
 */
export async function getCustomerEditById(req, res) {
    try {
        const customerID = parseInt(req.params.customerID, 10)
        const customer = await getCustomerForEdit(customerID)
        if (customer.length === 0) {
            return res.status(404).json({message: 'Cliente no encontrado'})
        }
        return res.json(customer[0])
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener los datos editables del cliente'})
    }
}

/**
 * Obtiene los contactos (principal y alternativo) de un cliente por su identificador.
 * Devuelve nombre, teléfono, fax y correo de ambos contactos.
 *
 * @param {import('express').Request} req Petición HTTP. Espera customerID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con los contactos del cliente.
 */
export async function getCustomerContactsById(req, res) {
    try {
        const customerID = parseInt(req.params.customerID, 10)
        const contacts = await getCustomerContacts(customerID)
        if (contacts.length === 0) {
            return res.status(404).json({message: 'Contactos no encontrados'})
        }
        return res.json(contacts)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener los contactos del cliente'})
    }
}

/**
 * Obtiene las direcciones de entrega y postal de un cliente,
 * junto con su ubicación geográfica (latitud/longitud).
 *
 * @param {import('express').Request} req Petición HTTP. Espera customerID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con las direcciones del cliente.
 */
export async function getCustomerAddressById(req, res) {
    try {
        const customerID = parseInt(req.params.customerID, 10)
        const address = await getCustomerAddress(customerID)
        if (address.length === 0) {
            return res.status(404).json({message: 'Direccion no encontrada'})
        }
        return res.json(address)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener la dirección del cliente'})
    }
}

/**
 * Crea un cliente con los datos del cuerpo de la solicitud.
 * Devuelve 201 con el identificador creado o 400 si faltan campos obligatorios.
 *
 * @param {import('express').Request} req Petición HTTP con los datos del cliente en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta con el CustomerID creado.
 */
export async function addCustomer(req, res) {
    const customer = req.body
    if (!customer || typeof customer !== 'object' || Array.isArray(customer)) {
        return res.status(400).json({message: 'El cuerpo de la solicitud debe contener los datos del cliente'})
    }
    const {fields, errors} = validateCustomer(customer)
    if (fields.length > 0) {
        return res.status(400).json({
            message: `Datos inválidos del cliente: ${errors[fields[0]]}`,
            fields,
            errors,
        })
    }
    try {
        const customerID = await insertCustomer(
            customer.customerName,
            customer.customerCategoryID,
            customer.billToCustomerID ?? null,
            customer.lastEditedBy,
            customer.standardDiscountPercentage ?? 0,
            customer.creditLimit ?? null,
            customer.isStatementSent ?? false,
            customer.isOnCreditHold ?? false,
            customer.buyingGroupID ?? null,
            customer.primaryContactPersonID,
            customer.alternateContactPersonID ?? null,
            customer.deliveryMethodID,
            customer.paymentDays,
            customer.phoneNumber,
            customer.faxNumber ?? null,
            customer.websiteURL ?? null,
            customer.deliveryAddressLine1,
            customer.deliveryAddressLine2 ?? null,
            customer.deliveryCityID,
            customer.deliveryPostalCode,
            customer.postalAddressLine1,
            customer.postalAddressLine2 ?? null,
            customer.latitude ?? null,
            customer.longitude ?? null,
        )
        return res.status(201).json(customerID)
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 51002) {
            return res.status(400).json({message: 'LastEditedBy no corresponde a un empleado válido.'})
        }
        return res.status(500).json({message: 'Error al crear el cliente'})
    }
}

/**
 * Elimina un cliente por su identificador.
 * Devuelve 404 si no existe y 409 si tiene registros asociados.
 *
 * @param {import('express').Request} req Petición HTTP con customerID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta sin contenido al eliminarlo.
 */
export async function removeCustomer(req, res) {
    const customerID = Number(req.params.customerID)
    try {
        await deleteCustomer(customerID)
        return res.status(204).send()
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 51000) {
            return res.status(404).json({message: 'El cliente indicado no existe.'})
        }
        if (sqlErrorCode === 51001) {
            return res.status(409).json({message: 'No se puede eliminar el cliente porque tiene facturas u otros registros asociados.'})
        }
        return res.status(500).json({message: 'Error al eliminar el cliente'})
    }
}

/**
 * Actualiza completamente los datos de un cliente.
 * Devuelve 400 ante datos inválidos, 404 si no existe y 200 al actualizarlo.
 *
 * @param {import('express').Request} req Petición con customerID en la ruta y datos en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Confirmación de la actualización.
 */
export async function editCustomer(req, res) {
    const customerID = Number(req.params.customerID)
    const customer = req.body
    if (!customer || typeof customer !== 'object' || Array.isArray(customer)) {
        return res.status(400).json({message: 'El cuerpo de la solicitud debe contener los datos del cliente'})
    }
    const {fields, errors} = validateCustomer(customer, true)
    if (fields.length > 0) {
        return res.status(400).json({message: `Datos inválidos del cliente: ${errors[fields[0]]}`, fields, errors})
    }
    try {
        await updateCustomer(
            customerID,
            customer.customerName,
            customer.customerCategoryID,
            customer.billToCustomerID,
            customer.lastEditedBy,
            customer.standardDiscountPercentage ?? 0,
            customer.creditLimit ?? null,
            customer.isStatementSent ?? false,
            customer.isOnCreditHold ?? false,
            customer.buyingGroupID ?? null,
            customer.primaryContactPersonID,
            customer.alternateContactPersonID ?? null,
            customer.deliveryMethodID,
            customer.paymentDays,
            customer.phoneNumber,
            customer.faxNumber ?? null,
            customer.websiteURL ?? null,
            customer.deliveryAddressLine1,
            customer.deliveryAddressLine2 ?? null,
            customer.deliveryCityID,
            customer.deliveryPostalCode,
            customer.postalAddressLine1,
            customer.postalAddressLine2 ?? null,
            customer.latitude ?? null,
            customer.longitude ?? null,
        )
        return res.status(200).json({customerID})
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 51000) {
            return res.status(404).json({message: 'El cliente indicado no existe.'})
        }
        if (sqlErrorCode === 51002) {
            return res.status(400).json({message: 'LastEditedBy no corresponde a un empleado válido.'})
        }
        return res.status(500).json({message: 'Error al actualizar el cliente'})
    }
}
