import express from "express";
import cors from "cors";
import { env } from "./config/env.js";

import { verifyToken } from "./middleware/auth.js";
import { isCorporateConnectionError } from "./helpers/corporateQuery.js";
import { isCatalogConnectionError } from "./helpers/catalogQuery.js";
import { isConnectionError } from "./helpers/connectionErrors.js";
import authRoutes from "./routes/authRoutes.js";
import customersRoutes from "./routes/customersRoutes.js";
import supplierRoutes from "./routes/suppliersRoutes.js";
import stockItemsRoutes from "./routes/stockItemsRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";

const app = express();

// Habilita CORS para permitir peticiones desde el frontend
app.use(cors({ origin: `http://localhost:${env.APP_PORT}` }));

// Parsea el cuerpo de las peticiones entrantes en formato JSON
app.use(express.json());

// Ruta pública de autenticación y verificación del JWT para el resto de /api
app.use("/api", authRoutes);
app.use("/api", verifyToken);

// Rutas de negocio protegidas por el JWT y los permisos de cada router.
app.use("/api", customersRoutes);
app.use("/api", supplierRoutes);
app.use("/api", stockItemsRoutes);
app.use("/api", salesRoutes);
app.use("/api", applicationRoutes);
app.use("/api", statsRoutes);

// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

// Middleware para el manejo de errores
app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ message: "El cuerpo de la solicitud debe ser JSON válido" });
  }
  const sqlErrorCode = Number(error.number);
  if (sqlErrorCode === 56003) {
    return res
      .status(401)
      .json({
        message:
          "El usuario no existe o está inactivo. Inicie sesión nuevamente",
      });
  }
  if (sqlErrorCode === 56001) {
    return res
      .status(403)
      .json({
        message: "El rol no tiene permisos para realizar esta operación",
      });
  }
  if (isCatalogConnectionError(error)) {
    const message =
      error.catalogNode === "corporativo"
        ? "Corporativo no está disponible para operar el catálogo. Intente nuevamente"
        : "No fue posible validar el usuario en su sucursal. Intente nuevamente";
    return res.status(503).json({ message });
  }
  if (isCorporateConnectionError(error)) {
    return res
      .status(503)
      .json({
        message:
          "No fue posible consultar los datos sensibles de Corporativo. Intente nuevamente",
      });
  }
  if (isConnectionError(error)) {
    return res
      .status(503)
      .json({
        message:
          "La sucursal seleccionada no está disponible. Intente nuevamente",
      });
  }
  res.status(500).json({ message: "Error interno del servidor" });
});

// Arranca el servidor en el puerto configurado
app.listen(env.API_PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${env.API_PORT}`);
});
