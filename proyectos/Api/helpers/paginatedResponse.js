/**
 * Envía una respuesta HTTP paginada estándar.
 *
 * Construye el cuerpo de la respuesta a partir del resultado devuelto
 * por un servicio ({ totalCount, data }), calculando el número total de páginas en base al tamaño de página recibido.
 *
 * @param {import('express').Response} res Respuesta HTTP de Express.
 * @param {number} pageNumber Página actual solicitada.
 * @param {number} pageSize Cantidad de registros por página.
 * @param {{ totalCount: number, data: object[] }} result Resultado devuelto por el servicio.
 * @returns {import('express').Response} Respuesta JSON con los datos paginados.
 */

export function paginatedResponse(res, pageNumber, pageSize, result) {
    const { totalCount = 0, data = [] } = result;
    return res.json({
        page: pageNumber,
        size: pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        data
    });
}