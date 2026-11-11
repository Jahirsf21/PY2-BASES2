import { formatValidationErrors } from '../helpers/validation.js'
import { paginationSchema } from '../schemas/pagination.js'

/**
 * Crea un middleware que valida el cuerpo JSON antes de ejecutar el controlador.
 * Responde con el formato de errores de los formularios y reemplaza req.body por los datos validados.
 *
 * @param {import('zod').ZodType} schema Esquema que debe cumplir req.body.
 * @returns {import('express').RequestHandler} Middleware que responde 400 con message, fields y errors si el cuerpo es inválido.
 */
export const validateBody = schema => (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
        if (result.error.issues[0].path.length === 0) {
            return res.status(400).json({message: result.error.issues[0].message})
        }
        const {fields, errors} = formatValidationErrors(result.error)
        return res.status(400).json({message: errors[fields[0]], fields, errors})
    }
    req.body = result.data
    next()
}

/**
 * Valida pageNumber y pageSize antes de ejecutar un controlador paginado.
 * Express 5 expone req.query como getter, por lo que los números validados se guardan en res.locals.pagination.
 *
 * @param {import('express').Request} req Petición HTTP. Espera pageNumber y pageSize en req.query.
 * @param {import('express').Response} res Respuesta HTTP. Recibe {pageNumber, pageSize} en res.locals.pagination.
 * @param {import('express').NextFunction} next Función que continúa hacia el controlador.
 * @returns {import('express').Response|void} Respuesta 400 si la paginación es inválida o continuación de la petición.
 */
export const validatePagination = (req, res, next) => {
    const result = paginationSchema.safeParse(req.query)
    if (!result.success) {
        return res.status(400).json({message: result.error.issues[0].message})
    }
    res.locals.pagination = result.data
    next()
}
