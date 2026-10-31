import { Router } from 'express'
import { login } from '../controllers/authController.js'

// Rutas de Autenticación.
const router = Router()

/**
 * POST /auth/login
 * Inicia sesión y devuelve un token JWT de 24 horas y los datos del usuario.
 * Ruta pública, sin token de autenticación.
 * Body: userName, password
 */
router.post('/auth/login', login)

export default router
