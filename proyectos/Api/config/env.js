import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

dotenv.config({path: fileURLToPath(new URL('../.env.local', import.meta.url)), quiet: true})

export const env = {
    DB_NAME: process.env.DB_NAME,
    DB_HOST: process.env.DB_HOST,
    DB_PORT_SAN_JOSE: Number(process.env.DB_PORT_SAN_JOSE),
    DB_USER_SAN_JOSE: process.env.DB_USER_SAN_JOSE,
    DB_PASSWORD_SAN_JOSE: process.env.DB_PASSWORD_SAN_JOSE,
    DB_PORT_LIMON: Number(process.env.DB_PORT_LIMON),
    DB_USER_LIMON: process.env.DB_USER_LIMON,
    DB_PASSWORD_LIMON: process.env.DB_PASSWORD_LIMON,
    DB_PORT_CORPORATIVO: Number(process.env.DB_PORT_CORPORATIVO),
    DB_USER_CORPORATIVO: process.env.DB_USER_CORPORATIVO,
    DB_PASSWORD_CORPORATIVO: process.env.DB_PASSWORD_CORPORATIVO,
    API_PORT: Number(process.env.API_PORT),
    APP_PORT: Number(process.env.APP_PORT),
    JWT_SECRET: process.env.JWT_SECRET
}

if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET no definido: configure la variable de entorno')
}
