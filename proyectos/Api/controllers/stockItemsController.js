import { paginatedResponse } from '../helpers/paginatedResponse.js'
import { validateStockItem } from '../helpers/entityValidation.js'
import { getStockItems, getStockGroups, getColors, getPackageTypes, getStockItemDetail, getStockItemForEdit, getStockItemGroups, insertStockItem, updateStockItem, deleteStockItem } from '../services/stockItems.js'

/**
 * Obtiene una página de productos.
 * Permite filtrar opcionalmente por nombre de producto y grupos.
 *
 * @param {import('express').Request} req Petición HTTP. Espera pageNumber, pageSize, stockItemName y stockGroupIDsJson en req.query. El arreglo JSON null o [] incluye todos los grupos.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con la página de productos.
 */
export async function listStockItems(req, res) {
    try {
        const pageNumber = Number(req.query.pageNumber)
        const pageSize = Number(req.query.pageSize)
        if (!Number.isInteger(pageNumber) || !Number.isInteger(pageSize) || pageNumber < 1 || pageSize < 1) {
            return res.status(400).json({message: 'pageNumber y pageSize deben ser enteros mayores a 0'})
        }
        if (pageSize > 100) {
            return res.status(400).json({message: 'pageSize no puede ser mayor a 100'})
        }
        const stockItemName = req.query.stockItemName
        const stockGroupIDsJson = req.query.stockGroupIDsJson
        const result = await getStockItems(stockItemName, stockGroupIDsJson, pageNumber, pageSize)
        return paginatedResponse(res, pageNumber, pageSize, result)
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 50003) {
            return res.status(400).json({message: 'StockGroupIDsJson debe ser un arreglo JSON de IDs de categorías.'})
        }
        if (sqlErrorCode === 50004) {
            return res.status(400).json({message: 'Los IDs de categorías deben ser números enteros positivos.'})
        }
        if (sqlErrorCode === 50005) {
            return res.status(400).json({message: 'Una o más categorías indicadas no existen en la base de datos.'})
        }
        return res.status(500).json({message: 'Error al obtener productos'})
    }
}

/**
 * Obtiene todos los grupos de productos.
 * Se usa para llenar el combo de filtros de la lista de productos.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con los grupos de productos.
 */
export async function listStockGroups(req, res) {
    try {
        const groups = await getStockGroups()
        return res.json(groups)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener los grupos de productos'})
    }
}

/**
 * Obtiene los colores disponibles para el formulario de productos.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con los colores.
 */
export async function listColors(req, res) {
    try {
        const colors = await getColors()
        return res.json(colors)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener colores'})
    }
}

/**
 * Obtiene los tipos de empaque disponibles para productos.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con los tipos de empaque.
 */
export async function listPackageTypes(req, res) {
    try {
        const packageTypes = await getPackageTypes()
        return res.json(packageTypes)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener empaques'})
    }
}

/**
 * Obtiene el detalle de un producto por su identificador.
 *
 * @param {import('express').Request} req Petición HTTP con stockItemID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Detalle del producto o 404.
 */
export async function getStockItemById(req, res) {
    try {
        const stockItemID = parseInt(req.params.stockItemID, 10)
        const items = await getStockItemDetail(stockItemID)
        if (items.length === 0) {
            return res.status(404).json({message: 'Producto no encontrado'})
        }
        return res.json(items)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener el producto'})
    }
}

/**
 * Obtiene los datos editables de un producto.
 *
 * @param {import('express').Request} req Petición HTTP con stockItemID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Datos del formulario o 404.
 */
export async function getStockItemEditById(req, res) {
    try {
        const stockItemID = parseInt(req.params.stockItemID, 10)
        const items = await getStockItemForEdit(stockItemID)
        if (items.length === 0) {
            return res.status(404).json({message: 'Producto no encontrado'})
        }
        return res.json(items[0])
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener el producto para editar'})
    }
}

/**
 * Obtiene los grupos asociados a un producto.
 *
 * @param {import('express').Request} req Petición HTTP con stockItemID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Grupos del producto o 404.
 */
export async function getStockItemGroupsById(req, res) {
    try {
        const stockItemID = parseInt(req.params.stockItemID, 10)
        const groups = await getStockItemGroups(stockItemID)
        if (groups.length === 0) {
            return res.status(404).json({message: 'Grupos del producto no encontrados'})
        }
        return res.json(groups)
    } catch (error) {
        return res.status(500).json({message: 'Error al obtener los grupos del producto'})
    }
}

/**
 * Crea un producto con los datos del cuerpo de la solicitud.
 *
 * @param {import('express').Request} req Petición HTTP con los datos del producto en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Identificador del producto creado.
 */
export async function addStockItem(req, res) {
    const item = req.body
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return res.status(400).json({message: 'Indique los datos del producto'})
    }
    const {fields, errors} = validateStockItem(item)
    if (fields.length > 0) {
        return res.status(400).json({message: errors[fields[0]], fields, errors})
    }
    try {
        const stockItemID = await insertStockItem(item)
        return res.status(201).json({stockItemID})
    } catch (error) {
        if (Number(error.number) === 547) {
            return res.status(400).json({message: 'Alguna referencia del producto (proveedor, color, empaque o grupo) no existe.'})
        }
        return res.status(500).json({message: 'Error al crear el producto'})
    }
}

/**
 * Actualiza los datos de un producto.
 *
 * @param {import('express').Request} req Petición HTTP con stockItemID en la ruta y datos en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Confirmación de la actualización.
 */
export async function editStockItem(req, res) {
    const stockItemID = Number(req.params.stockItemID)
    const item = req.body
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return res.status(400).json({message: 'Indique los datos del producto'})
    }
    const {fields, errors} = validateStockItem(item)
    if (fields.length > 0) {
        return res.status(400).json({message: errors[fields[0]], fields, errors})
    }
    try {
        await updateStockItem(stockItemID, item)
        return res.json({stockItemID})
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 53000) {
            return res.status(404).json({message: 'Producto no encontrado'})
        }
        if (sqlErrorCode === 547) {
            return res.status(400).json({message: 'Alguna referencia del producto (proveedor, color, empaque o grupo) no existe.'})
        }
        return res.status(500).json({message: 'Error al actualizar el producto'})
    }
}

/**
 * Elimina un producto por su identificador.
 *
 * @param {import('express').Request} req Petición HTTP con stockItemID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta sin contenido al eliminarlo.
 */
export async function removeStockItem(req, res) {
    const stockItemID = Number(req.params.stockItemID)
    try {
        await deleteStockItem(stockItemID)
        return res.status(204).send()
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 53001) {
            return res.status(404).json({message: 'Producto no encontrado'})
        }
        if (sqlErrorCode === 53002) {
            return res.status(409).json({message: 'El producto tiene ventas u órdenes asociadas'})
        }
        return res.status(500).json({message: 'Error al eliminar el producto'})
    }
}
