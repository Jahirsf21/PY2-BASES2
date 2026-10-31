import type { PaginatedResponse } from './paginatedResponse'

/** Persona devuelta por la búsqueda paginada de contactos. */
export interface Person {
  PersonID: number
  NombreCompleto: string
}

/** Empleado devuelto por Application.GetEmployee. */
export interface Employee {
  PersonID: number
  NombreCompleto: string
}

/** Ciudad devuelta por la búsqueda paginada de ubicaciones. */
export interface City {
  CityID: number
  NombreCiudad: string
  Provincia: string
  NombrePais: string
}

/** Respuesta paginada de la búsqueda de personas. */
export type PeopleResponse = PaginatedResponse<Person>

/** Respuesta paginada de la búsqueda de ciudades. */
export type CitiesResponse = PaginatedResponse<City>
