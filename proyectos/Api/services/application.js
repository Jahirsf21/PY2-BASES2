import sql from "mssql";
import { executeProcedure } from "../helpers/procedure.js";

/**
 * Obtiene una página de personas que no son empleados ni vendedores, excluyendo la persona con ID 1.
 * Permite filtrar opcionalmente por nombre completo.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {object} filters fullName opcional (búsqueda parcial), con pageNumber y pageSize.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de registros y personas de la página.
 */
export async function getPeople(session, filters) {
  const result = await executeProcedure(
    session,
    "Application.GetPeople",
    {
      FullName: [sql.NVarChar, filters.fullName],
      PageNumber: [sql.Int, filters.pageNumber],
      PageSize: [sql.Int, filters.pageSize],
    },
    { TotalCount: sql.Int },
  );
  return { totalCount: result.output.TotalCount, data: result.recordset };
}

/**
 * Obtiene una página de ciudades junto con el total de registros.
 * Permite filtrar opcionalmente por nombre de ciudad, provincia y país.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {object} filters cityName, provinceName y countryName opcionales (búsqueda parcial), con pageNumber y pageSize.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de registros y ciudades de la página.
 */
export async function getCities(session, filters) {
  const result = await executeProcedure(
    session,
    "Application.GetCities",
    {
      CityName: [sql.NVarChar, filters.cityName],
      ProvinceName: [sql.NVarChar, filters.provinceName],
      CountryName: [sql.NVarChar, filters.countryName],
      PageNumber: [sql.Int, filters.pageNumber],
      PageSize: [sql.Int, filters.pageSize],
    },
    { TotalCount: sql.Int },
  );
  return { totalCount: result.output.TotalCount, data: result.recordset };
}

/**
 * Obtiene todos los métodos de entrega.
 * Se usa para llenar los combos de filtros y formularios de clientes y proveedores.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @returns {Promise<object[]>} Listado de métodos de entrega.
 */
export async function getDeliveryMethods(session) {
  return (await executeProcedure(session, "Application.GetDeliveryMethods"))
    .recordset;
}

/**
 * Obtiene las personas registradas como empleados para los formularios.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @returns {Promise<object[]>} Empleados con PersonID y NombreCompleto.
 */
export async function getEmployees(session) {
  return (await executeProcedure(session, "Application.GetEmployee")).recordset;
}

/**
 * Obtiene las personas registradas como vendedores para las facturas.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @returns {Promise<object[]>} Personas registradas como vendedores.
 */
export async function getSalespeople(session) {
  return (await executeProcedure(session, "Application.GetSalespeople"))
    .recordset;
}
