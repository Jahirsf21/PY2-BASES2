import { paginatedResponse } from '../helpers/paginatedResponse.js'
import { getStockItems, getStockGroups, getColors, getPackageTypes, getStockItemDetail, getStockItemForEdit, getStockItemGroups, insertStockItem, updateStockItem, deleteStockItem } from '../services/stockItems.js'

/**
 * Obtiene una página de productos.
 * Permite filtrar opcionalmente por nombre de producto y grupos.
 *
 * @param {import('express').Request} req Petición HTTP. Espera pageNumber, pageSize, stockItemName y stockGroupIDsJson en req.query. El arreglo JSON null o [] incluye todos los grupos.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con la página de productos.
 */
export async function listStockItems(req, res, next) {
    try {
        const {pageNumber, pageSize} = res.locals.pagination
        const stockItemName = req.query.stockItemName
        const stockGroupIDsJson = req.query.stockGroupIDsJson
        const result = await getStockItems(stockItemName, stockGroupIDsJson, pageNumber, pageSize, req.user.userID, req.user.node)
        return paginatedResponse(res, pageNumber, pageSize, result)
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 50003) {
            return res.status(400).json({message: 'StockGroupIDsJson debe ser un arreglo JSON de IDs de categorías'})
        }
        if (sqlErrorCode === 50004) {
            return res.status(400).json({message: 'Los IDs de categorías deben ser números enteros positivos'})
        }
        if (sqlErrorCode === 50005) {
            return res.status(400).json({message: 'Una o más categorías indicadas no existen en la base de datos'})
        }
        return next(error)
    }
}

/**
 * Obtiene todos los grupos de productos.
 * Se usa para llenar el combo de filtros de la lista de productos.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con los grupos de productos.
 */
export async function listStockGroups(req, res, next) {
    try {
        const groups = await getStockGroups(req.user.userID, req.user.node)
        return res.json(groups)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene los colores disponibles para el formulario de productos.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con los colores.
 */
export async function listColors(req, res, next) {
    try {
        const colors = await getColors(req.user.userID, req.user.node)
        return res.json(colors)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene los tipos de empaque disponibles para productos.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con los tipos de empaque.
 */
export async function listPackageTypes(req, res, next) {
    try {
        const packageTypes = await getPackageTypes(req.user.userID, req.user.node)
        return res.json(packageTypes)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene el detalle de un producto por su identificador.
 *
 * @param {import('express').Request} req Petición HTTP con stockItemID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Detalle del producto o 404.
 */
export async function getStockItemById(req, res, next) {
    try {
        const stockItemID = parseInt(req.params.stockItemID, 10)
        const items = await getStockItemDetail(stockItemID, req.user.userID, req.user.node)
        if (items.length === 0) {
            return res.status(404).json({message: 'Producto no encontrado'})
        }
        return res.json(items)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene los datos editables de un producto.
 *
 * @param {import('express').Request} req Petición HTTP con stockItemID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Datos del formulario o 404.
 */
export async function getStockItemEditById(req, res, next) {
    try {
        const stockItemID = parseInt(req.params.stockItemID, 10)
        const items = await getStockItemForEdit(stockItemID, req.user.userID, req.user.node)
        if (items.length === 0) {
            return res.status(404).json({message: 'Producto no encontrado'})
        }
        return res.json(items[0])
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene los grupos asociados a un producto.
 *
 * @param {import('express').Request} req Petición HTTP con stockItemID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Grupos del producto o 404.
 */
export async function getStockItemGroupsById(req, res, next) {
    try {
        const stockItemID = parseInt(req.params.stockItemID, 10)
        const groups = await getStockItemGroups(stockItemID, req.user.userID, req.user.node)
        if (groups.length === 0) {
            return res.status(404).json({message: 'Grupos del producto no encontrados'})
        }
        return res.json(groups)
    } catch (error) {
        return next(error)
    }
}

/**
 * Crea un producto con los datos del cuerpo de la solicitud.
 *
 * @param {import('express').Request} req Petición HTTP con los datos del producto en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Identificador del producto creado.
 */
export async function addStockItem(req, res, next) {
    const item = req.body
    try {
        const stockItemID = await insertStockItem(item, req.user.userID, req.user.node)
        return res.status(201).json({stockItemID})
    } catch (error) {
        if (Number(error.number) === 547) {
            return res.status(400).json({message: 'Alguna referencia del producto (proveedor, color, empaque o grupo) no existe'})
        }
        return next(error)
    }
}

/**
 * Actualiza los datos de un producto.
 *
 * @param {import('express').Request} req Petición HTTP con stockItemID en la ruta y datos en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Confirmación de la actualización.
 */
export async function editStockItem(req, res, next) {
    const stockItemID = Number(req.params.stockItemID)
    const item = req.body
    try {
        await updateStockItem(stockItemID, item, req.user.userID, req.user.node)
        return res.json({stockItemID})
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 53000) {
            return res.status(404).json({message: 'Producto no encontrado'})
        }
        if (sqlErrorCode === 547) {
            return res.status(400).json({message: 'Alguna referencia del producto (proveedor, color, empaque o grupo) no existe'})
        }
        return next(error)
    }
}

/**
 * Elimina un producto por su identificador.
 *
 * @param {import('express').Request} req Petición HTTP con stockItemID en req.params.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta sin contenido al eliminarlo.
 */
export async function removeStockItem(req, res, next) {
    const stockItemID = Number(req.params.stockItemID)
    try {
        await deleteStockItem(stockItemID, req.user.userID, req.user.node)
        return res.status(204).send()
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 53001) {
            return res.status(404).json({message: 'Producto no encontrado'})
        }
        if (sqlErrorCode === 53002) {
            return res.status(409).json({message: 'El producto tiene ventas u órdenes asociadas'})
        }
        return next(error)
    }
}
