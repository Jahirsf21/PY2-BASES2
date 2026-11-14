import { z } from "zod";
import { queryText } from "./common.js";

/** Filtros del buscador de personas. */
export const peopleQuery = z.object({
  fullName: queryText("El nombre completo", 100),
});

/** Filtros del buscador de ciudades. */
export const citiesQuery = z.object({
  cityName: queryText("El nombre de la ciudad", 100),
  provinceName: queryText("El nombre de la provincia", 100),
  countryName: queryText("El nombre del país", 100),
});
