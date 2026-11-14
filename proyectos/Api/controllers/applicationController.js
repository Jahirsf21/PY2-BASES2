import { paginatedResponse } from "../helpers/paginatedResponse.js";
import {
  getPeople,
  getCities,
  getDeliveryMethods,
  getEmployees,
  getSalespeople,
} from "../services/application.js";

/**
 * Obtiene una página de personas, opcionalmente filtradas por nombre.
 *
 * @param {import('express').Request} req Petición HTTP. Los filtros validados llegan en res.locals.query y la paginación en res.locals.pagination.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con la página de personas.
 */
export async function listPeople(req, res) {
  const { pageNumber, pageSize } = res.locals.pagination;
  const result = await getPeople(req.user, {
    ...res.locals.query,
    pageNumber,
    pageSize,
  });
  return paginatedResponse(res, pageNumber, pageSize, result);
}

/**
 * Obtiene una página de ciudades, opcionalmente filtradas por nombre de ciudad, provincia y país.
 *
 * @param {import('express').Request} req Petición HTTP. Los filtros validados llegan en res.locals.query y la paginación en res.locals.pagination.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con la página de ciudades.
 */
export async function listCities(req, res) {
  const { pageNumber, pageSize } = res.locals.pagination;
  const result = await getCities(req.user, {
    ...res.locals.query,
    pageNumber,
    pageSize,
  });
  return paginatedResponse(res, pageNumber, pageSize, result);
}

/**
 * Obtiene todos los métodos de entrega.
 * Se usa para llenar los combos de filtros y formularios de clientes y proveedores.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con los métodos de entrega.
 */
export async function listDeliveryMethods(req, res) {
  const methods = await getDeliveryMethods(req.user);
  return res.json(methods);
}

/**
 * Obtiene los empleados disponibles para los formularios.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con los empleados.
 */
export async function listEmployees(req, res) {
  const employees = await getEmployees(req.user);
  return res.json(employees);
}

/**
 * Obtiene los vendedores disponibles para las facturas.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con los vendedores.
 */
export async function listSalespeople(req, res) {
  const salespeople = await getSalespeople(req.user);
  return res.json(salespeople);
}
