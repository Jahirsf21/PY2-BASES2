import sql from "mssql";
import { getPool } from "../config/database.js";
import { idSchema } from "../schemas/common.js";
import { isRoleAllowedInNode } from "./entityValidation.js";
import { isConnectionError } from "./connectionErrors.js";
import { addParameters, executeProcedure } from "./procedure.js";

const userIDSchema = idSchema("Usuario", true);

/**
 * Valida al Administrador en su sucursal antes de ejecutar un SP del catálogo central.
 * La identidad debe proceder de req.user verificado y la ruta debe conservar requireRole.
 * El nombre del SP y los parámetros son internos del servicio, no del body.
 * Repite la validación en cada llamada y no valida el UserID como usuario de Corporativo.
 *
 * @param {object} session Identidad de req.user, con userID y node (san-jose o limon).
 * @param {string} procedure Procedimiento de Corporativo preparado para la identidad de la sucursal.
 * @param {object} [params] Entradas como { Nombre: [tipo, valor] }.
 * @param {object} [outputs] Salidas como { Nombre: tipo }.
 * @returns {Promise<object>} Resultado completo de mssql, con recordset, recordsets y output.
 */
export async function executeCatalogProcedure(
  session,
  procedure,
  params = {},
  outputs = {},
) {
  const { userID, node } = session ?? {};
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

    await executeProcedure(session, "dbo.ValidateUserAccess", {
      RequiredRole: [sql.NVarChar(50), "Administrador"],
    });

    targetNode = "corporativo";
    const request = (await getPool(targetNode)).request();
    request.input("UserID", sql.Int, userID);
    request.input("OriginNode", sql.NVarChar(20), node);
    addParameters(request, params, outputs);
    return await request.execute(procedure);
  } catch (error) {
    if (error instanceof Error) {
      error.catalogQuery = true;
      error.catalogNode = targetNode;
    }
    throw error;
  }
}

/**
 * Ejecuta un SP en el nodo indicado con el @UserID y el @OriginNode de la sesión.
 * Requiere que la sesión ya esté validada en su sucursal por executeCatalogProcedure.
 *
 * @param {object} session Identidad de req.user, con userID y node (san-jose o limon).
 * @param {string} targetNode Nodo donde se ejecuta: san-jose, limon o corporativo.
 * @param {string} procedure Procedimiento preparado para la identidad de la sucursal.
 * @param {object} [params] Entradas como { Nombre: [tipo, valor] }.
 * @returns {Promise<object>} Resultado completo de mssql.
 */
export async function executeOnNode(
  session,
  targetNode,
  procedure,
  params = {},
) {
  try {
    const request = (await getPool(targetNode)).request();
    request.input("UserID", sql.Int, session.userID);
    request.input("OriginNode", sql.NVarChar(20), session.node);
    addParameters(request, params);
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
