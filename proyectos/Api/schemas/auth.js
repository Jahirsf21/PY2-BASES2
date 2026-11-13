import { z } from "zod";
import { idSchema, textSchema } from "./common.js";

/**
 * Valida el identificador de uno de los tres nodos configurados.
 *
 * @type {import('zod').ZodType<'san-jose'|'limon'|'corporativo'>}
 */
export const nodeSchema = z.enum(["san-jose", "limon", "corporativo"], {
  error: "Seleccione san-jose, limon o corporativo.",
});

/**
 * Valida que el rol pueda utilizar el nodo indicado.
 * Administrador pertenece a san-jose o limon; Corporativo pertenece a corporativo.
 *
 * @type {import('zod').ZodType<{rol: 'Administrador', node: 'san-jose'|'limon'}|{rol: 'Corporativo', node: 'corporativo'}>}
 */
export const roleNodeSchema = z.discriminatedUnion("rol", [
  z.object({
    rol: z.literal("Administrador"),
    node: z.enum(["san-jose", "limon"]),
  }),
  z.object({ rol: z.literal("Corporativo"), node: z.literal("corporativo") }),
]);

/**
 * Valida el cuerpo de POST /api/auth/login.
 * El nodo se comprueba primero como texto obligatorio y después como uno de los nodos configurados.
 *
 * @type {import('zod').ZodType<{userName: string, password: string, node: string}>}
 */
export const loginSchema = z.object(
  {
    userName: textSchema("Nombre de usuario", 50, true),
    password: textSchema("Contraseña", 255, true),
    node: textSchema("Identificador de sucursal", 50, true).pipe(nodeSchema),
  },
  { error: "Indique los datos de inicio de sesión" },
);

/**
 * Valida la sesión contenida en el JWT y la guardada en req.user.
 * Descarta las demás propiedades del token; la identidad solo procede de su firma verificada.
 *
 * @type {import('zod').ZodType<{userID: number, userName: string, rol: string, node: string}>}
 */
export const sessionSchema = z
  .object({
    userID: idSchema("Usuario", true),
    userName: textSchema("Nombre de usuario", 50, true),
  })
  .and(roleNodeSchema);
