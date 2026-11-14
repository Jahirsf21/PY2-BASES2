import { getPool } from "../config/database.js";
import sql from "mssql";
import { addParameters } from "../helpers/procedure.js";

/**
 * Obtiene los datos de un usuario activo mediante dbo.LoginUser.
 * El procedimiento compara la contraseña recibida con la contraseña cifrada almacenada.
 * Se ejecuta antes de existir una sesión, por eso no envía @UserID.
 *
 * @param {object} credentials userName, password y node validados; node es donde se comprueban las credenciales.
 * @returns {Promise<object[]>} Datos del usuario en una fila, o un arreglo vacío si las credenciales no son válidas.
 */
export async function loginUser(credentials) {
  const request = addParameters((await getPool(credentials.node)).request(), {
    UserName: [sql.NVarChar(50), credentials.userName],
    Password: [sql.NVarChar(255), credentials.password],
  });
  return (await request.execute("dbo.LoginUser")).recordset;
}
