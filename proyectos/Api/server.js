import express from 'express'
import cors from 'cors'
import {env} from './config/env.js'

import { verifyToken } from './middleware/auth.js'
import authRoutes from './routes/authRoutes.js'
import customersRoutes from './routes/customersRoutes.js'
import supplierRoutes from './routes/suppliersRoutes.js'
import stockItemsRoutes from './routes/stockItemsRoutes.js'
import salesRoutes from './routes/salesRoutes.js'
import applicationRoutes from './routes/applicationRoutes.js'
import statsRoutes from './routes/statsRoutes.js'

const app = express()

// Habilita CORS para permitir peticiones desde el frontend
app.use(cors({origin:`http://localhost:${env.APP_PORT}`}))

// Parsea el cuerpo de las peticiones entrantes en formato JSON
app.use(express.json())

// Rutas de la API
app.use('/api', authRoutes)
app.use('/api', verifyToken)
app.use('/api', customersRoutes)
app.use('/api', supplierRoutes)
app.use('/api', stockItemsRoutes)
app.use('/api', salesRoutes)
app.use('/api', applicationRoutes)
app.use('/api', statsRoutes)

// Middleware para rutas no encontradas
app.use((req, res)=> {
    res.status(404).json({message: 'Ruta no encontrada'})
})

// Middleware para el manejo de errores
app.use((error, req, res, next) => {
    console.error(error)
    res.status(500).json({message: 'Error interno del servidor.'})
})

// Arranca el servidor en el puerto configurado
app.listen(env.API_PORT, ()=>{
    console.log(`servidor corriendo en http://localhost:${env.API_PORT}`)
})
