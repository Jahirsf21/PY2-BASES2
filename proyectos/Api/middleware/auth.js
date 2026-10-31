import jwt from 'jsonwebtoken'
import {env} from '../config/env.js'

if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET no definido: configure la variable de entorno')
}

const JWT_SECRET = env.JWT_SECRET

/**
 * Verifica la firma y el vencimiento del token de autenticación.
 * Guarda el identificador y nombre del usuario en req.user.
 *
 * @param {import('express').Request} req Petición HTTP. Espera un token Bearer en req.headers.authorization.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Función que continúa hacia la ruta protegida.
 * @returns {import('express').Response|void} Respuesta JSON de error o continuación de la petición.
 */
export const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'No se proporcionó token de autenticación'
            })
        }
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, JWT_SECRET)
        req.user = {
            userID: decoded.userID,
            userName: decoded.userName
        }
        next()
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Token expirado. Por favor, inicie sesión nuevamente'
            })
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: 'Token inválido'
            })
        }
        return res.status(500).json({
            message: 'Error al verificar el token'
        })
    }
}


/**
 * Genera un token de autenticación con el identificador y nombre del usuario.
 * Permite indicar su vigencia; por defecto, vence a las 24 horas.
 *
 * @param {object} userData Datos del usuario autenticado.
 * @param {number} userData.userID Identificador del usuario.
 * @param {string} userData.userName Nombre del usuario.
 * @param {string|number} [expiresIn] Vigencia del token como texto de duración o número de segundos.
 * @returns {string} Token JWT firmado.
 */
export const generate_token = (userData, expiresIn = '24h') => {
    return jwt.sign(
        {
            userID: userData.userID,
            userName: userData.userName
        },
        JWT_SECRET,
        {expiresIn}
    )
}
