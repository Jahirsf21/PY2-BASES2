import { isRoleAllowedInNode } from "../helpers/entityValidation.js";
import { generateToken } from "../middleware/auth.js";
import { loginUser } from "../services/auth.js";

/**
 * Inicia sesión con las credenciales de un usuario activo.
 * Devuelve un token de autenticación de 24 horas y los datos del usuario.
 *
 * @param {import('express').Request} req Petición HTTP. Espera userName, password y node en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Deriva los errores de conexión y los no reconocidos al manejador global.
 * @returns {Promise<import('express').Response|void>} Respuesta JSON con el token y los datos del usuario.
 */
export async function login(req, res, next) {
  const credentials = req.body;
  try {
    const [user] = await loginUser(credentials);
    if (!user || user.Active !== true) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    if (!isRoleAllowedInNode(user.Rol, credentials.node)) {
      return res
        .status(403)
        .json({ message: "El rol no tiene acceso a la sucursal seleccionada" });
    }
    const token = generateToken({
      userID: user.UserID,
      userName: user.UserName,
      rol: user.Rol,
      node: credentials.node,
    });
    return res.json({
      token,
      user: {
        UserID: user.UserID,
        UserName: user.UserName,
        FullName: user.FullName,
        Rol: user.Rol,
        Active: user.Active,
      },
      node: credentials.node,
    });
  } catch (error) {
    if (Number(error.number) === 56001) {
      return res
        .status(403)
        .json({ message: "El rol no tiene acceso a la sucursal seleccionada" });
    }
    return next(error);
  }
}
