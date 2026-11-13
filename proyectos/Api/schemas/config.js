import { z } from "zod";

/**
 * Valida que JWT_SECRET esté definido y no sea texto vacío.
 *
 * @type {import('zod').ZodType<string>}
 */
export const jwtSecretSchema = z
  .string({ error: "JWT_SECRET no definido: configure la variable de entorno" })
  .min(1, {
    error: "JWT_SECRET no definido: configure la variable de entorno",
  });

/**
 * Valida las credenciales y el puerto de un nodo.
 * Se comprueba al abrir la sucursal, por lo que no se exige configurar nodos que no se utilizan.
 *
 * @type {import('zod').ZodType<{user: string, password: string, port: number}>}
 */
export const nodeConfigurationSchema = z.object({
  user: z.string().min(1),
  password: z.string().min(1),
  port: z.number().refine((value) => value !== 0),
});
