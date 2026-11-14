import { prepareProcedure } from "./procedure.js";

/**
 * Ejecuta un procedimiento de la sucursal que consulta datos de Corporativo.
 * Devuelve sus filas y marca los errores de ejecución antes de propagarlos;
 * los errores al conectar con la sucursal se propagan sin marca.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {string} procedure Nombre del procedimiento almacenado.
 * @param {object} [params] Entradas como { Nombre: [tipo, valor] }.
 * @returns {Promise<object[]>} Filas devueltas por el procedimiento, o un arreglo vacío si no hay recordset.
 */
export async function executeCorporateProcedure(session, procedure, params) {
  const request = await prepareProcedure(session, params);
  try {
    const result = await request.execute(procedure);
    return result.recordset ?? [];
  } catch (error) {
    if (error instanceof Error) error.corporateQuery = true;
    throw error;
  }
}

/**
 * Comprueba si una consulta a Corporativo presenta un error de conexión reconocido.
 * Reconoce ETIMEOUT o EREQUEST con número 11001, únicamente en consultas marcadas.
 *
 * @param {object} error Error de ejecución recibido.
 * @returns {boolean} Verdadero si el error tiene la marca de Corporativo y uno de los códigos reconocidos.
 */
export function isCorporateConnectionError(error) {
  return (
    error?.corporateQuery === true &&
    (error.code === "ETIMEOUT" ||
      (error.code === "EREQUEST" && Number(error.number) === 11001))
  );
}
