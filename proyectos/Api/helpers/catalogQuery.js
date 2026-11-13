import sql from "mssql";
import { getPool } from "../config/database.js";
import { idSchema } from "../schemas/common.js";
import { isRoleAllowedInNode } from "./entityValidation.js";
import { isConnectionError } from "./connectionErrors.js";

const userIDSchema = idSchema("Usuario", true);

/**
 * Valida al Administrador en su sucursal antes de ejecutar un SP del catálogo central.
 * La identidad debe proceder de req.user verificado y la ruta debe conservar requireRole.
 * El nombre del SP y la configuración de parámetros son internos del servicio, no del body.
 * No reutiliza la autorización entre peticiones ni valida el UserID como usuario de Corporativo.
 *
 * @param {number} userID Identificador del usuario autenticado en su nodo de origen.
 * @param {string} node Sucursal del JWT verificado: san-jose o limon.
 * @param {string} procedure Procedimiento corporativo preparado para la identidad delegada.
 * @param {(request: import('mssql').Request) => void|Promise<void>} [configureRequest] Parámetros de negocio y salidas del SP.
 * @returns {Promise<import('mssql').IProcedureResult<object>>} Resultado completo, incluidos recordsets y outputs.
 */
export async function executeCatalogProcedure(
  userID,
  node,
  procedure,
  configureRequest,
) {
  let targetNode = node;
  try {
    if (!isRoleAllowedInNode("Administrador", node)) {
      throw Object.assign(
        new Error("El rol no tiene acceso a la sucursal seleccionada."),
        { number: 56001 },
      );
    }
    if (!userIDSchema.safeParse(userID).success) {
      throw Object.assign(new Error("El usuario no existe o está inactivo."), {
        number: 56003,
      });
    }

    const origin = (await getPool(node)).request();
    origin.input("UserID", sql.Int, userID);
    origin.input("RequiredRole", sql.NVarChar(50), "Administrador");
    await origin.execute("dbo.ValidateUserAccess");

    targetNode = "corporativo";
    const request = (await getPool(targetNode)).request();
    request.input("UserID", sql.Int, userID);
    request.input("OriginNode", sql.NVarChar(20), node);
    await configureRequest?.(request);
    return await request.execute(procedure);
  } catch (error) {
    if (error instanceof Error) {
      error.catalogQuery = true;
      error.catalogNode = targetNode;
    }
    throw error;
  }
}

/** Identifica los errores de conexión conocidos dentro del flujo de catálogo central. */
export function isCatalogConnectionError(error) {
  return (
    error?.catalogQuery === true &&
    ["san-jose", "limon", "corporativo"].includes(error.catalogNode) &&
    isConnectionError(error)
  );
}
