/** Respuesta estándar para los endpoints que devuelven datos paginados. */
export interface PaginatedResponse<T> {
  page: number
  size: number
  totalCount: number
  totalPages: number
  data: T[]
}
