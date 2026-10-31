import {getPool} from '../config/database.js'
import sql from "mssql"

/**
 * Obtiene los datos de un usuario activo mediante dbo.LoginUser.
 * El procedimiento compara la contraseña recibida con el hash SHA2_256 almacenado.
 *
 * @param {string} userName Nombre del usuario.
 * @param {string} password Contraseña del usuario.
 * @returns {Promise<object[]>} Datos del usuario en una fila, o un arreglo vacío si las credenciales no son válidas.
 */
export async function loginUser(userName, password) {
    const connection = (await getPool()).request()
    connection.input('UserName', sql.NVarChar, userName)
    connection.input('Password', sql.NVarChar, password)
    const result = await connection.execute('dbo.LoginUser')
    return result.recordset
}
