import { paginatedResponse } from '../helpers/paginatedResponse.js'
import { getPurchaseYears, getInvoiceYears, getSupplierPurchaseSummary, getCustomerSalesSummary, getTopCustomersByYear, getTopProductsByYear, getTopSuppliersByYear, getProductCategorySalesByYear, getCustomerSalesTracking, getSupplierPurchaseTracking } from '../services/stats.js'

/**
 * Obtiene los años disponibles para los filtros de los reportes de compras.
 *
 * @param {import('express').Request} req Petición HTTP sin filtros.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con los años de compras.
 */
export async function listPurchaseYears(req, res, next) {
    try {
        const years = await getPurchaseYears(req.user.userID, req.user.node)
        return res.json(years)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene los años disponibles para los filtros de los reportes de ventas.
 *
 * @param {import('express').Request} req Petición HTTP sin filtros.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con los años de facturación.
 */
export async function listInvoiceYears(req, res, next) {
    try {
        const years = await getInvoiceYears(req.user.userID, req.user.node)
        return res.json(years)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene el resumen de montos de las órdenes de compra por proveedor y categoría.
 *
 * @param {import('express').Request} req Petición con supplierName y supplierCategoryName opcionales en req.query.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Resumen de proveedores y fila de resumen general.
 */
export async function listSupplierPurchaseSummary(req, res, next) {
    try {
        const supplierName = req.query.supplierName
        const supplierCategoryName = req.query.supplierCategoryName
        const result = await getSupplierPurchaseSummary(supplierName, supplierCategoryName, req.user.userID, req.user.node)
        return res.json(result)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene una página del resumen de montos facturados por cliente y categoría.
 *
 * @param {import('express').Request} req Petición con customerName, customerCategoryName, pageNumber y pageSize en req.query.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Resumen paginado con el total de registros.
 */
export async function listCustomerSalesSummary(req, res, next) {
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
        const customerCategoryName = req.query.customerCategoryName
        const result = await getCustomerSalesSummary(customerName, customerCategoryName, pageNumber, pageSize, req.user.userID, req.user.node)
        return paginatedResponse(res, pageNumber, pageSize, result)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene los clientes de los primeros cinco niveles del ranking anual por cantidad de facturas.
 *
 * @param {import('express').Request} req Petición con invoiceYearFrom e invoiceYearTo opcionales en req.query.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Ranking anual de clientes, incluyendo empates.
 */
export async function listTopCustomersByYear(req, res, next) {
    try {
        const invoiceYearFrom = req.query.invoiceYearFrom
        const invoiceYearTo = req.query.invoiceYearTo
        const result = await getTopCustomersByYear(invoiceYearFrom, invoiceYearTo, req.user.userID, req.user.node)
        return res.json(result)
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 50001) {
            return res.status(400).json({message: 'El año inicial indicado no existe en la base de datos'})
        }
        if (sqlErrorCode === 50002) {
            return res.status(400).json({message: 'El año final indicado no existe en la base de datos'})
        }
        if (sqlErrorCode === 50003) {
            return res.status(400).json({message: 'El año inicial no puede ser mayor que el año final'})
        }
        return next(error)
    }
}

/**
 * Obtiene los productos de los primeros cinco niveles del ranking anual por ganancia acumulada.
 *
 * @param {import('express').Request} req Petición con year opcional en req.query.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Ranking anual de productos, incluyendo empates.
 */
export async function listTopProductsByYear(req, res, next) {
    try {
        const year = req.query.year
        const result = await getTopProductsByYear(year, req.user.userID, req.user.node)
        return res.json(result)
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 50001) {
            return res.status(400).json({message: 'El año indicado no existe en la base de datos'})
        }
        return next(error)
    }
}

/**
 * Obtiene los proveedores de los primeros cinco niveles del ranking anual por cantidad de compras.
 *
 * @param {import('express').Request} req Petición con orderYearFrom y orderYearTo opcionales en req.query.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Ranking anual de proveedores, incluyendo empates.
 */
export async function listTopSuppliersByYear(req, res, next) {
    try {
        const orderYearFrom = req.query.orderYearFrom
        const orderYearTo = req.query.orderYearTo
        const result = await getTopSuppliersByYear(orderYearFrom, orderYearTo, req.user.userID, req.user.node)
        return res.json(result)
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 50001) {
            return res.status(400).json({message: 'El año inicial indicado no existe en la base de datos'})
        }
        if (sqlErrorCode === 50002) {
            return res.status(400).json({message: 'El año final indicado no existe en la base de datos'})
        }
        if (sqlErrorCode === 50003) {
            return res.status(400).json({message: 'El año inicial no puede ser mayor que el año final'})
        }
        return next(error)
    }
}

/**
 * Obtiene los montos facturados por año con una columna por grupo de productos.
 *
 * @param {import('express').Request} req Petición HTTP sin filtros.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Montos anuales por grupo de productos.
 */
export async function listProductCategorySalesByYear(req, res, next) {
    try {
        const result = await getProductCategorySalesByYear(req.user.userID, req.user.node)
        return res.json(result)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene el seguimiento mensual paginado de ventas por cliente.
 *
 * @param {import('express').Request} req Petición con year, month, stockGroupIDsJson, pageNumber y pageSize en req.query.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Montos de primera y última factura, cantidades total, máxima y mínima y categorías.
 */
export async function listCustomerSalesTracking(req, res, next) {
    try {
        const pageNumber = Number(req.query.pageNumber)
        const pageSize = Number(req.query.pageSize)
        if (!Number.isInteger(pageNumber) || !Number.isInteger(pageSize) || pageNumber < 1 || pageSize < 1) {
            return res.status(400).json({message: 'pageNumber y pageSize deben ser enteros mayores a 0'})
        }
        if (pageSize > 100) {
            return res.status(400).json({message: 'pageSize no puede ser mayor a 100'})
        }
        const year = req.query.year
        const month = req.query.month
        const stockGroupIDsJson = req.query.stockGroupIDsJson
        const result = await getCustomerSalesTracking(year, month, stockGroupIDsJson, pageNumber, pageSize, req.user.userID, req.user.node)
        return paginatedResponse(res, pageNumber, pageSize, result)
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 50001) {
            return res.status(400).json({message: 'El año indicado no existe en la base de datos'})
        }
        if (sqlErrorCode === 50002) {
            return res.status(400).json({message: 'El mes debe estar entre 1 y 12'})
        }
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
 * Obtiene el seguimiento mensual paginado de compras por proveedor.
 * Envía año, mes y categorías al procedimiento para filtrar el conteo y los resultados.
 *
 * @param {import('express').Request} req Petición con year, month, stockGroupIDsJson, pageNumber y pageSize en req.query.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Montos de primera y última compra, cantidades total, máxima y mínima de empaques y categorías.
 */
export async function listSupplierPurchaseTracking(req, res, next) {
    try {
        const pageNumber = Number(req.query.pageNumber)
        const pageSize = Number(req.query.pageSize)
        if (!Number.isInteger(pageNumber) || !Number.isInteger(pageSize) || pageNumber < 1 || pageSize < 1) {
            return res.status(400).json({message: 'pageNumber y pageSize deben ser enteros mayores a 0'})
        }
        if (pageSize > 100) {
            return res.status(400).json({message: 'pageSize no puede ser mayor a 100'})
        }
        const year = req.query.year
        const month = req.query.month
        const stockGroupIDsJson = req.query.stockGroupIDsJson
        const result = await getSupplierPurchaseTracking(year, month, stockGroupIDsJson, pageNumber, pageSize, req.user.userID, req.user.node)
        return paginatedResponse(res, pageNumber, pageSize, result)
    } catch (error) {
        const sqlErrorCode = Number(error.number)
        if (sqlErrorCode === 50001) {
            return res.status(400).json({message: 'El año indicado no existe en la base de datos'})
        }
        if (sqlErrorCode === 50002) {
            return res.status(400).json({message: 'El mes debe estar entre 1 y 12'})
        }
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
