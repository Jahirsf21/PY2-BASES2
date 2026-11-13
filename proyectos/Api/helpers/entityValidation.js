import { nodeSchema, roleNodeSchema } from "../schemas/auth.js";

/**
 * Comprueba si el identificador corresponde a un nodo configurado.
 *
 * @param {unknown} node Identificador recibido.
 * @returns {boolean} Verdadero para uno de los tres nodos permitidos.
 */
export function isValidNode(node) {
  return nodeSchema.safeParse(node).success;
}

/**
 * Comprueba si el rol puede utilizar el nodo seleccionado.
 *
 * @param {unknown} rol Rol del usuario.
 * @param {unknown} node Identificador del nodo.
 * @returns {boolean} Verdadero si la combinación está permitida.
 */
export function isRoleAllowedInNode(rol, node) {
  return roleNodeSchema.safeParse({ rol, node }).success;
}
