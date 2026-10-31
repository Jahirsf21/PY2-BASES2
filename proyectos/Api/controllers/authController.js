import { validateLogin } from '../helpers/entityValidation.js'
import { generate_token } from '../middleware/auth.js'
import { loginUser } from '../services/auth.js'

/**
 * Inicia sesión con las credenciales de un usuario activo.
 * Devuelve un token de autenticación de 24 horas y los datos del usuario.
 *
 * @param {import('express').Request} req Petición HTTP. Espera userName y password en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con el token y los datos del usuario.
 */
export async function login(req, res) {
    const credentials = req.body
    if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) {
        return res.status(400).json({message: 'Indique los datos de inicio de sesión'})
    }
    const {fields, errors} = validateLogin(credentials)
    if (fields.length > 0) {
        return res.status(400).json({message: errors[fields[0]], fields, errors})
    }
    try {
        const [user] = await loginUser(credentials.userName, credentials.password)
        if (!user) {
            return res.status(401).json({message: 'Credenciales inválidas'})
        }
        const token = generate_token({userID: user.UserID, userName: user.UserName})
        return res.json({token, user})
    } catch (error) {
        return res.status(500).json({message: 'Error al iniciar sesión'})
    }
}
