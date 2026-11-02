import {getPool} from '../config/database.js'
import sql from "mssql"

/**
 * Obtiene los datos de un usuario activo mediante dbo.LoginUser.
 * El procedimiento compara la contraseña recibida con la contraseña cifrada almacenada.
 *
 * @param {string} userName Nombre del usuario.
 * @param {string} password Contraseña del usuario.
 * @param {string} node Nodo donde se comprueban las credenciales.
 * @returns {Promise<object[]>} Datos del usuario en una fila, o un arreglo vacío si las credenciales no son válidas.
 */
export async function loginUser(userName, password, node) {
    const connection = (await getPool(node)).request()
    connection.input('UserName', sql.NVarChar(50), userName)
    connection.input('Password', sql.NVarChar(255), password)
    const result = await connection.execute('dbo.LoginUser')
    return result.recordset
}
