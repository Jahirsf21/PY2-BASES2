import { paginatedResponse } from '../helpers/paginatedResponse.js'
import { getPeople, getCities, getDeliveryMethods, getEmployees, getSalespeople } from '../services/application.js'

/**
 * Obtiene una página de personas, opcionalmente filtradas por nombre.
 *
 * @param {import('express').Request} req Petición HTTP. Espera pageNumber, pageSize y fullName en req.query.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con la página de personas.
 */
export async function listPeople(req, res, next) {
    try {
        const pageNumber = Number(req.query.pageNumber)
        const pageSize = Number(req.query.pageSize)
        if (!Number.isInteger(pageNumber) || !Number.isInteger(pageSize) || pageNumber < 1 || pageSize < 1) {
            return res.status(400).json({message: 'pageNumber y pageSize deben ser enteros mayores a 0'})
        }
        if (pageSize > 100) {
            return res.status(400).json({message: 'pageSize no puede ser mayor a 100'})
        }
        const fullName = req.query.fullName
        const result = await getPeople(fullName, pageNumber, pageSize, req.user.userID, req.user.node)
        return paginatedResponse(res, pageNumber, pageSize, result)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene una página de ciudades, opcionalmente filtradas por nombre de ciudad, provincia y país.
 *
 * @param {import('express').Request} req Petición HTTP. Espera pageNumber, pageSize, cityName, provinceName y countryName en req.query.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con la página de ciudades.
 */
export async function listCities(req, res, next) {
    try {
        const pageNumber = Number(req.query.pageNumber)
        const pageSize = Number(req.query.pageSize)
        if (!Number.isInteger(pageNumber) || !Number.isInteger(pageSize) || pageNumber < 1 || pageSize < 1) {
            return res.status(400).json({message: 'pageNumber y pageSize deben ser enteros mayores a 0'})
        }
        if (pageSize > 100) {
            return res.status(400).json({message: 'pageSize no puede ser mayor a 100'})
        }
        const cityName = req.query.cityName
        const provinceName = req.query.provinceName
        const countryName = req.query.countryName
        const result = await getCities(cityName, provinceName, countryName, pageNumber, pageSize, req.user.userID, req.user.node)
        return paginatedResponse(res, pageNumber, pageSize, result)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene todos los métodos de entrega.
 * Se usa para llenar los combos de filtros y formularios de clientes y proveedores.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con los métodos de entrega.
 */
export async function listDeliveryMethods(req, res, next) {
    try {
        const methods = await getDeliveryMethods(req.user.userID, req.user.node)
        return res.json(methods)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene los empleados disponibles para los formularios.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con los empleados.
 */
export async function listEmployees(req, res, next) {
    try {
        const employees = await getEmployees(req.user.userID, req.user.node)
        return res.json(employees)
    } catch (error) {
        return next(error)
    }
}

/**
 * Obtiene los vendedores disponibles para las facturas.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores comunes al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con los vendedores.
 */
export async function listSalespeople(req, res, next) {
    try {
        const salespeople = await getSalespeople(req.user.userID, req.user.node)
        return res.json(salespeople)
    } catch (error) {
        return next(error)
    }
}
