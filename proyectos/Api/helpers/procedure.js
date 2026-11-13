import sql from "mssql";
import { getPool } from "../config/database.js";

const SESSION_PARAMETERS = new Set(["UserID", "OriginNode"]);

/**
 * Agrega a una petición los parámetros de entrada y salida declarados por el servicio.
 * Rechaza @UserID y @OriginNode porque se toman de la sesión verificada.
 *
 * @param {import('mssql').Request} request Petición SQL a configurar.
 * @param {object} [params] Entradas como { Nombre: [tipo, valor] }.
 * @param {object} [outputs] Salidas como { Nombre: tipo }.
 * @returns {import('mssql').Request} La misma petición configurada.
 */
export function addParameters(request, params = {}, outputs = {}) {
  for (const name of [...Object.keys(params), ...Object.keys(outputs)]) {
    if (SESSION_PARAMETERS.has(name)) {
      throw new Error(`El parámetro ${name} se toma de la sesión`);
    }
  }
  for (const [name, [type, value]] of Object.entries(params)) {
    request.input(name, type, value);
  }
  for (const [name, type] of Object.entries(outputs)) {
    request.output(name, type);
  }
  return request;
}

/**
 * Ejecuta un procedimiento en el nodo de la sesión con el @UserID de la sesión verificada.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {string} procedure Nombre del procedimiento almacenado.
 * @param {object} [params] Entradas como { Nombre: [tipo, valor] }.
 * @param {object} [outputs] Salidas como { Nombre: tipo }.
 * @returns {Promise<object>} Resultado completo de mssql, con recordset, recordsets y output.
 */
export async function executeProcedure(
  session,
  procedure,
  params = {},
  outputs = {},
) {
  const request = (await getPool(session.node)).request();
  request.input("UserID", sql.Int, session.userID);
  addParameters(request, params, outputs);
  return request.execute(procedure);
}
