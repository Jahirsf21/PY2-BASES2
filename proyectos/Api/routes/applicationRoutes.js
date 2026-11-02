import { Router } from 'express'
import { listPeople, listCities, listDeliveryMethods, listEmployees, listSalespeople } from '../controllers/applicationController.js'
import { requireRole } from '../middleware/auth.js'

// Rutas de Application (referencias de formularios para Administrador).
const router = Router()

/**
 * GET /people
 * Devuelve una página de personas paginada.
 * Query params: pageNumber, pageSize, fullName
 */
router.get('/people', requireRole('Administrador'), listPeople)

/**
 * GET /employees
 * Devuelve las personas registradas como empleados.
 */
router.get('/employees', requireRole('Administrador'), listEmployees)

/**
 * GET /salespeople
 * Devuelve los vendedores disponibles para los formularios de facturas.
 */
router.get('/salespeople', requireRole('Administrador'), listSalespeople)

/**
 * GET /cities
 * Devuelve una página de ciudades paginada.
 * Query params: pageNumber, pageSize, cityName, provinceName, countryName
 */
router.get('/cities', requireRole('Administrador'), listCities)

/**
 * GET /delivery-methods
 * Devuelve todos los métodos de entrega para los combos de filtros.
 */
router.get('/delivery-methods', requireRole('Administrador'), listDeliveryMethods)

export default router
