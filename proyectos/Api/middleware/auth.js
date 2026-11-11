import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { sessionSchema } from '../schemas/auth.js'

const JWT_SECRET = env.JWT_SECRET

/**
 * Verifica la firma y el vencimiento del token de autenticación.
 * Guarda la identidad, el rol y el nodo del usuario en req.user.
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
        const session = sessionSchema.safeParse(decoded)
        if (!session.success) {
            return res.status(401).json({message: 'Token inválido. Inicie sesión nuevamente'})
        }
        req.user = session.data
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
    next()
}

/** Exige uno de los roles indicados después de verificar el JWT. */
export const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.rol)) {
        return res.status(403).json({message: 'El rol no tiene permisos para realizar esta operación'})
    }
    next()
}


/**
 * Genera un token de autenticación con la identidad, el rol y el nodo del usuario.
 * Permite indicar su vigencia; por defecto, vence a las 24 horas.
 *
 * @param {object} userData Datos del usuario autenticado.
 * @param {number} userData.userID Identificador del usuario.
 * @param {string} userData.userName Nombre del usuario.
 * @param {string} userData.rol Rol registrado en el nodo.
 * @param {string} userData.node Nodo de la sesión.
 * @param {string|number} [expiresIn] Vigencia del token como texto de duración o número de segundos.
 * @returns {string} Token JWT firmado.
 */
export const generateToken = (userData, expiresIn = '24h') => {
    const session = sessionSchema.safeParse(userData)
    if (!session.success) {
        throw new Error('Datos de sesión inválidos')
    }
    return jwt.sign(
        session.data,
        JWT_SECRET,
        {expiresIn}
    )
}
