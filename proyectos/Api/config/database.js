import dotenv from 'dotenv'
import sql from 'mssql'
import {env} from './env.js'


const config = {
  production: {
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    server: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  }
}

const poolPromise = new sql.ConnectionPool(config.production)
    .connect()
    .then(pool => {
        console.log('Conectado a la base de datos')
        return pool
    })
    .catch(error => {
        console.log('Error de conexión a la base de datos', error)
        throw error
    })


export async function getPool() {
    return poolPromise
}