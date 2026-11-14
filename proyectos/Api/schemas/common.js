import { z } from "zod";
import { formatFieldPath } from "../helpers/validation.js";

export const SQL_INT_MAX = 2147483647;

/**
 * Indica si un campo no contiene un valor utilizable.
 * Considera vacíos null, undefined y el texto vacío, sin transformar el valor.
 *
 * @param {unknown} value Valor a comprobar.
 * @returns {boolean} Verdadero si el valor está ausente o contiene solo espacios.
 */
export function isEmpty(value) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && !value.trim())
  );
}

const emptyValueSchema = z.custom(isEmpty);

/**
 * Aplica la obligatoriedad de un campo antes de validar su valor.
 * Un campo opcional acepta valores vacíos; uno obligatorio informa que falta antes de aplicar el esquema.
 *
 * @param {import('zod').ZodType} schema Esquema del valor cuando el campo no está vacío.
 * @param {string|((issue: object) => string)} label Nombre legible del campo, o función que lo obtiene del error.
 * @param {boolean} required Indica si el campo es obligatorio.
 * @param {string|((issue: object) => string)} invalidMessage Mensaje para un valor opcional inválido.
 * @returns {import('zod').ZodType} Esquema que valida presencia y valor.
 */
export function withPresence(schema, label, required, invalidMessage) {
  if (!required)
    return z
      .union([emptyValueSchema, schema], { error: invalidMessage })
      .optional();
  return z
    .unknown()
    .refine((value) => !isEmpty(value), {
      error: (issue) =>
        `${typeof label === "function" ? label(issue) : label} es obligatorio.`,
      abort: true,
    })
    .pipe(schema);
}

/**
 * Crea el esquema de un campo de texto con su obligatoriedad y longitud máxima.
 *
 * @param {string} label Nombre legible del campo para el mensaje.
 * @param {number} [maxLength] Longitud máxima permitida.
 * @param {boolean} [required] Indica si el campo es obligatorio.
 * @returns {import('zod').ZodType} Esquema del campo de texto.
 */
export function textSchema(label, maxLength, required = false) {
  const message = maxLength
    ? `${label} debe ser texto de máximo ${maxLength} caracteres.`
    : `${label} debe ser texto.`;
  let schema = z.string({ error: message });
  if (maxLength) schema = schema.max(maxLength, { error: message });
  return withPresence(schema, label, required, message);
}

/**
 * Crea el esquema de un identificador entero positivo dentro del rango int de SQL Server.
 *
 * @param {string} label Nombre legible del campo para el mensaje.
 * @param {boolean} [required] Indica si el campo es obligatorio.
 * @returns {import('zod').ZodType} Esquema del identificador.
 */
export function idSchema(label, required = false) {
  const message = `${label} debe ser un identificador entero positivo.`;
  const schema = z
    .number({ error: message })
    .int({ error: message })
    .min(1, { error: message })
    .max(SQL_INT_MAX, { error: message });
  return withPresence(schema, label, required, message);
}

/**
 * Crea el esquema de un identificador recibido como texto en un parámetro de ruta.
 * Acepta solo dígitos sin cero inicial y lo convierte a número dentro del rango int de SQL Server.
 *
 * @param {string} label Nombre legible del parámetro para el mensaje.
 * @returns {import('zod').ZodType<number>} Esquema que devuelve el identificador como número.
 */
export function idParamSchema(label) {
  const message = `${label} debe ser un identificador entero positivo.`;
  return z
    .string({ error: message })
    .regex(/^[1-9]\d*$/, { error: message })
    .transform(Number)
    .pipe(z.number().max(SQL_INT_MAX, { error: message }));
}

/**
 * Crea el esquema de los parámetros de una ruta con un único identificador.
 * El nombre debe coincidir con el parámetro declarado en la ruta, por ejemplo customerID en /customers/:customerID.
 *
 * @param {string} name Nombre del parámetro de ruta.
 * @param {string} label Nombre legible de la entidad para el mensaje.
 * @returns {import('zod').ZodType<Record<string, number>>} Esquema que devuelve el identificador como número.
 */
export function idParams(name, label) {
  return z.object({ [name]: idParamSchema(label) });
}

/**
 * Valida la versión opaca que devuelve SQL Server: '0x' seguido de 16 dígitos hexadecimales.
 * Se conserva como texto; el servicio la convierte a Buffer al enviarla al procedimiento.
 *
 * @type {import('zod').ZodType<string>}
 */
export const versionSchema = z
  .string({ error: "La versión es obligatoria. Recargue los datos." })
  .regex(/^0x[0-9A-Fa-f]{16}$/, {
    error: "La versión no es válida. Recargue los datos.",
  });

/**
 * Crea el esquema de un campo booleano opcional.
 *
 * @param {string} label Nombre legible del campo para el mensaje.
 * @returns {import('zod').ZodType} Esquema del campo booleano.
 */
export function booleanSchema(label) {
  const message = `${label} debe ser verdadero o falso.`;
  return withPresence(z.boolean({ error: message }), label, false, message);
}

/**
 * Crea el esquema de un número no negativo de las columnas int y decimal de productos y facturas.
 * Limita la precisión decimal de cada columna y rechaza números enviados como texto.
 *
 * @param {string} field Nombre del campo; se reemplaza por la ruta completa cuando el error la incluye.
 * @param {number} decimals Cantidad de decimales permitidos; cero exige un entero.
 * @param {boolean} [required] Indica si el valor es obligatorio.
 * @returns {import('zod').ZodType} Esquema del monto o cantidad.
 */
export function amountSchema(field, decimals, required = false) {
  const label = (issue) => formatFieldPath(issue.path) || field;
  const message = (issue) =>
    `${label(issue)} debe ser un número no negativo${decimals ? ` con máximo ${decimals} decimales` : " entero dentro del rango int"}.`;
  let schema = z.number({ error: message }).min(0, { error: message });
  if (decimals === 0) {
    schema = schema
      .int({ error: message })
      .max(SQL_INT_MAX, { error: message });
  } else {
    schema = schema
      .lt(10 ** (18 - decimals), { error: message })
      .refine((value) => Number(value.toFixed(decimals)) === value, {
        error: message,
      });
  }
  return withPresence(schema, label, required, message);
}

/**
 * Trata un filtro vacío de la URL como ausente.
 *
 * @param {unknown} value Valor recibido en req.query.
 * @returns {unknown} undefined si es texto vacío o solo espacios; en otro caso, el mismo valor.
 */
export function emptyToUndefined(value) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

/**
 * Crea el esquema de un filtro de texto opcional con longitud máxima.
 *
 * @param {string} label Nombre legible del filtro para el mensaje.
 * @param {number} maxLength Longitud máxima permitida.
 * @returns {import('zod').ZodType<string|undefined>} Esquema del filtro, sin espacios en los extremos.
 */
export function queryText(label, maxLength) {
  const message = `${label} debe ser texto de máximo ${maxLength} caracteres.`;
  return z.preprocess(
    emptyToUndefined,
    z
      .string({ error: message })
      .trim()
      .max(maxLength, { error: message })
      .optional(),
  );
}

/**
 * Crea el esquema de un filtro entero opcional dentro de un rango.
 *
 * @param {string} label Nombre legible del filtro para el mensaje.
 * @param {number} min Valor mínimo permitido.
 * @param {number} max Valor máximo permitido.
 * @returns {import('zod').ZodType<number|undefined>} Esquema que convierte el texto de la URL a número.
 */
export function queryInteger(label, min, max) {
  const message = `${label} debe ser un número entero entre ${min} y ${max}.`;
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: message })
      .int({ error: message })
      .min(min, { error: message })
      .max(max, { error: message })
      .optional(),
  );
}

/**
 * Crea el esquema de un identificador opcional recibido en la URL.
 *
 * @param {string} label Nombre legible del filtro para el mensaje.
 * @returns {import('zod').ZodType<number|undefined>} Esquema que convierte el texto de la URL a número.
 */
export function queryId(label) {
  const message = `${label} debe ser un identificador entero positivo.`;
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: message })
      .int({ error: message })
      .min(1, { error: message })
      .max(SQL_INT_MAX, { error: message })
      .optional(),
  );
}

/**
 * Crea el esquema de una fecha opcional recibida en la URL con formato AAAA-MM-DD.
 *
 * @param {string} label Nombre legible del filtro para el mensaje.
 * @returns {import('zod').ZodType<string|undefined>} Esquema que conserva la fecha como texto.
 */
export function queryDate(label) {
  const message = `${label} debe ser una fecha válida con formato AAAA-MM-DD.`;
  return z.preprocess(
    emptyToUndefined,
    z
      .string({ error: message })
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: message })
      .refine(
        (value) => {
          const date = new Date(`${value}T00:00:00Z`);
          return (
            !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === value
          );
        },
        { error: message },
      )
      .optional(),
  );
}

/**
 * Crea el esquema de un monto opcional recibido en la URL, con máximo 2 decimales.
 * El signo lo valida el procedimiento almacenado.
 *
 * @param {string} label Nombre legible del filtro para el mensaje.
 * @returns {import('zod').ZodType<number|undefined>} Esquema que convierte el texto de la URL a número.
 */
export function queryAmount(label) {
  const message = `${label} debe ser un número con máximo 2 decimales.`;
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: message })
      .refine((value) => Math.abs(value) < 1e16, { error: message })
      .refine((value) => Number(value.toFixed(2)) === value, {
        error: message,
      })
      .optional(),
  );
}
