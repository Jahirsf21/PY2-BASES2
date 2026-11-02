import sql from 'mssql'
import {env} from './env.js'
import { isValidNode } from '../helpers/entityValidation.js'

const configurations = {
  'san-jose': {
    user: env.DB_USER_SAN_JOSE,
    password: env.DB_PASSWORD_SAN_JOSE,
    port: env.DB_PORT_SAN_JOSE
  },
  limon: {
    user: env.DB_USER_LIMON,
    password: env.DB_PASSWORD_LIMON,
    port: env.DB_PORT_LIMON
  },
  corporativo: {
    user: env.DB_USER_CORPORATIVO,
    password: env.DB_PASSWORD_CORPORATIVO,
    port: env.DB_PORT_CORPORATIVO
  }
}

const pools = new Map()

export async function getPool(node) {
  if (!isValidNode(node)) {
    throw new Error('Sucursal inválida')
  }
  const config = configurations[node]
  if (!config.user || !config.password || !config.port) {
    throw new Error(`Configure las credenciales y el puerto de la sucursal ${node}`)
  }

  if (pools.has(node)) return pools.get(node)

  const pool = new sql.ConnectionPool({
    ...config,
    server: env.DB_HOST,
    database: env.DB_NAME,
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  })
  const promise = pool.connect()
    .then(async connection => {
      const result = await connection.request().query(`
        select convert(nvarchar(128), serverproperty('MachineName')) as Node, 
        db_name() as DatabaseName
      `)
      const instance = result.recordset[0]
      if (instance?.Node !== node || instance.DatabaseName !== 'WideWorldImporters') {
        throw new Error(`La conexión no corresponde a la sucursal ${node} o a WideWorldImporters`)
      }
      return connection
    })
    .catch(async error => {
      if (pools.get(node) === promise) pools.delete(node)
      await pool.close().catch(() => {})
      throw error
    })
  pool.on('error', () => {
    if (pools.get(node) === promise) pools.delete(node)
    void pool.close().catch(() => {})
  })
  pools.set(node, promise)
  return promise
}
