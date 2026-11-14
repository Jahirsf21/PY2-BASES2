import { Router } from "express";
import { login } from "../controllers/authController.js";
import { sqlErrors } from "../middleware/sqlErrors.js";
import { validateBody } from "../middleware/validation.js";
import { loginSchema } from "../schemas/auth.js";

// Rutas de Autenticación.
const router = Router();

/**
 * POST /auth/login
 * Inicia sesión en el nodo elegido y devuelve token, datos del usuario y nodo.
 * Ruta pública, sin token de autenticación.
 * Body: userName, password, node (san-jose, limon o corporativo).
 */
router.post(
  "/auth/login",
  validateBody(loginSchema),
  login,
  sqlErrors({
    56001: [403, "El rol no tiene acceso a la sucursal seleccionada"],
  }),
);

export default router;
