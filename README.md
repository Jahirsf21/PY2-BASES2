# PROYECTO 2 – BASES 2

**Institución:** Tecnológico de Costa Rica, Centro Académico de Limón  
**Curso:** Bases de Datos II  
**Grupo:** 60  
**Profesor:** Ing. Cristian Paz Campos Agüero  
**Semestre:** II Semestre 2026

## Estudiantes

| Nombre                   | Carnet      |
|--------------------------|-------------|
| Deislher Sanchez Funez   | 2023032794  |
| Natalia Granados Rosales | 2021144286  |

## Introducción

Este proyecto implementa una aplicación web con frontend, API REST y SQL Server en un contenedor Linux para consultar y administrar la base de datos **WideWorldImporters**. Incluye módulos de clientes, proveedores, inventario, ventas y reportes estadísticos de compras y ventas.

## Requisitos

- [Node.js](https://nodejs.org/es/download).
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) con WSL y contenedores Linux.
- [SQL Server Management Studio (SSMS)](https://learn.microsoft.com/es-es/ssms/install/install).
- pnpm.

Para instalar pnpm después de instalar Node.js:

```powershell
npm install -g pnpm
```

## SQL Server 2025 con Docker y WideWorldImporters

### 1. Instalar WSL

Abra PowerShell como administrador y ejecute:

```powershell
wsl --install
```

Reinicie el equipo si se solicita. Instale y abra Docker Desktop, y habilite el motor basado en WSL para utilizar contenedores Linux. Puede consultar la [guía de instalación de WSL](https://learn.microsoft.com/es-es/windows/wsl/install).

### 2. Descargar y ejecutar SQL Server

En PowerShell, descargue la imagen:

```powershell
docker pull mcr.microsoft.com/mssql/server:2025-latest
```

Cree el contenedor. Reemplace `TUCONTRASEÑA` por la contraseña que utilizará para `sa`; debe tener al menos ocho caracteres y combinar tres de estos cuatro grupos: mayúsculas, minúsculas, números y símbolos.

```powershell
docker run -e 'ACCEPT_EULA=Y' -e 'MSSQL_SA_PASSWORD=TUCONTRASEÑA' -p 1433:1433 --name PY1-BASES2 --hostname PY1-BASES2 -v py1-bases2-data:/var/opt/mssql -d mcr.microsoft.com/mssql/server:2025-latest
```

### 3. Conectar mediante SSMS

| Campo | Valor |
|---|---|
| Server Name | `localhost,1433` |
| Autenticación | SQL Server Authentication |
| Usuario | `sa` |
| Contraseña | La definida al crear el contenedor |
| Trust server certificate | Activado |

### 4. Restaurar WideWorldImporters OLTP

1. Descargue `WideWorldImporters-Full.bak` desde la [publicación oficial de WideWorldImporters](https://github.com/Microsoft/sql-server-samples/releases/tag/wide-world-importers-v1.0). Este es el respaldo OLTP utilizado por el proyecto.
2. Copie el respaldo al contenedor. El siguiente ejemplo supone que está en la carpeta **Downloads**; ajuste la ruta si lo descargó en otra ubicación:

   ```powershell
   docker exec PY1-BASES2 mkdir -p /var/opt/mssql/backup
   docker cp "$env:USERPROFILE\Downloads\WideWorldImporters-Full.bak" PY1-BASES2:/var/opt/mssql/backup/WideWorldImporters-Full.bak
   ```

3. En SSMS, haga clic derecho en **Databases** y seleccione **Restore Database...**.
4. En **Source**, seleccione **Device** y agregue `/var/opt/mssql/backup/WideWorldImporters-Full.bak`. Establezca **WideWorldImporters** como nombre de la base de destino.
5. Verifique que el respaldo esté marcado en **Backup sets to restore** y ejecute la restauración.
6. Actualice **Databases** y confirme que aparece `WideWorldImporters`.

## Dependencias

El backend utiliza Node.js, `express`, `mssql`, `dotenv` y `cors` para exponer la API y conectarse a SQL Server.

El frontend utiliza Next.js, React y TypeScript, con componentes de shadcn, estilos de Tailwind CSS e iconos de Lucide React.

Las dependencias se instalan con `pnpm install` en cada proyecto, como se muestra en los comandos de arranque.

## Configuración de variables de entorno

### Backend

Cree el archivo `proyectos/Api/.env.local` y complete las credenciales de SQL Server:

```env
DB_NAME=WideWorldImporters
DB_USER=sa
DB_HOST=localhost
DB_PORT=1433
DB_PASSWORD=TUCONTRASEÑA
API_PORT=3002
APP_PORT=3000
```

`DB_PASSWORD` debe coincidir con la contraseña del contenedor. `APP_PORT` debe coincidir con el puerto del frontend, porque la API permite solicitudes desde `http://localhost:APP_PORT` mediante CORS.

### Frontend

Cree el archivo `proyectos/WebSite/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

La URL debe coincidir con `API_PORT`.

## Ejecutar los scripts SQL

1. Conéctese desde SSMS a la base de datos `WideWorldImporters`.
2. Abra una **Nueva consulta** y seleccione esa base de datos.
3. Abra y ejecute todo el contenido de los siguientes archivos, en este orden:

   | Orden | Script | Contenido |
   |---|---|---|
   | 1 | [synonyms.sql](Script/synonyms.sql) | Sinónimos para las tablas utilizadas por los procedimientos. |
   | 2 | [application.sql](Script/application.sql) | Personas, ciudades y métodos de entrega. |
   | 3 | [customers.sql](Script/customers.sql) | Consultas y operaciones de clientes. |
   | 4 | [suppliers.sql](Script/suppliers.sql) | Consultas y operaciones de proveedores. |
   | 5 | [inventory.sql](Script/inventory.sql) | Consultas y operaciones de inventario. |
   | 6 | [sales.sql](Script/sales.sql) | Consultas y operaciones de facturas. |
   | 7 | [stats.sql](Script/stats.sql) | Resúmenes, rankings y seguimiento de compras y ventas. |

Los scripts crean los procedimientos utilizados por la API sobre la base restaurada. Los sinónimos deben ejecutarse primero. Antes de ejecutar `stats.sql`, confirme que la consulta utiliza `WideWorldImporters`, porque ese archivo no incluye una instrucción `USE`.

## Levantar el proyecto

Ejecute los siguientes comandos desde la raíz del repositorio, después de restaurar la base de datos, ejecutar los scripts y configurar los archivos `.env.local`.

### Backend

En una terminal:

```powershell
cd proyectos/Api
pnpm install
node server.js
```

La API quedará disponible en `http://localhost:3002`, con sus endpoints bajo `/api`.

### Frontend

En otra terminal:

```powershell
cd proyectos/WebSite
pnpm install
pnpm run dev
```

Abra `http://localhost:3000`. Si Next.js inicia en otro puerto, ajuste `APP_PORT` y reinicie la API para actualizar el origen permitido por CORS.

### Ejecutar ambos proyectos con un comando

Después de instalar las dependencias de `Api` y `WebSite`, puede iniciarlos juntos desde una terminal ubicada en la raíz del repositorio:

```powershell
cd proyectos
pnpm install
pnpm run dev
```

Este comando utiliza `concurrently` para ejecutar el frontend y la API.


## Estado del proyecto 1,5

Se alcanzaron los objetivos de los cuatro módulos de gestión y los primeros ocho reportes estadísticos del enunciado. Los únicos objetivos no alcanzados corresponden a los reportes 9 y 10.

| Área | Objetivo | Estado |
|---|---|---|
| Módulo de clientes (2.1) | Gestionar clientes, aplicar y restaurar filtros acumulativos, presentar el listado ordenado y consultar sus detalles y ubicación en un mapa. | Alcanzado |
| Módulo de proveedores (2.2) | Gestionar proveedores, aplicar y restaurar filtros acumulativos, presentar el listado ordenado y consultar sus detalles y ubicación en un mapa. | Alcanzado |
| Módulo de inventarios (2.3) | Gestionar productos, consultar existencias, aplicar y restaurar filtros acumulativos y mostrar el listado ordenado y los detalles de cada producto. | Alcanzado |
| Módulo de ventas (2.4) | Gestionar ventas, filtrar por cliente, fechas, método de entrega y montos, restaurar los filtros y consultar el encabezado y las líneas de cada factura. | Alcanzado |
| Reporte 1 | Montos máximos, mínimos y promedio de compras por proveedor y categoría, utilizando `ROLLUP` y filtros por nombre y categoría. | Alcanzado |
| Reporte 2 | Montos máximos, mínimos y promedio de ventas por cliente y categoría, utilizando `ROLLUP` y filtros por nombre y categoría. | Alcanzado |
| Reporte 3 | Top 5 de productos por ganancia anual, utilizando `DENSE_RANK` y particiones, con selección de años válidos en la base de datos. | Alcanzado |
| Reporte 4 | Top 5 de clientes por cantidad de facturas y monto total facturado por año, con filtros por rango de años válidos. | Alcanzado |
| Reporte 5 | Top 5 de proveedores por cantidad de órdenes de compra y monto total comprado por año, con filtros por rango de años válidos. | Alcanzado |
| Reporte 6 | Matriz resumen de ventas por categoría de producto y año. | Alcanzado |
| Reporte 7 | Seguimiento mensual de compras por cliente, con primera y última factura, totales y valores mínimos y máximos. | Alcanzado |
| Reporte 8 | Seguimiento mensual de compras por proveedor, con primera y última compra, totales y valores mínimos y máximos. | Alcanzado |
| Reporte 9 | Promedio de días de rotación de inventario por producto, con filtros por categoría de producto, año y proveedor. | **No alcanzado** |
| Reporte 10 | Método de envío favorito por destino, ordenado por cantidad de ventas, con filtros por año, mes, categoría de cliente, categoría de producto y producto. | **No alcanzado** |
| SQL Server | Realizar las búsquedas, cálculos y agrupaciones mediante procedimientos almacenados. | Alcanzado |
| Sinónimos | Acceder a las tablas desde los procedimientos almacenados mediante sinónimos. | Alcanzado |
| Transacciones | Utilizar `TRANSACTION`, `COMMIT` y `ROLLBACK` en las operaciones de inserción, actualización y eliminación. | Alcanzado |
| API REST | Integrar el frontend con SQL Server mediante servicios, controladores y rutas para enviar parámetros y devolver resultados. | Alcanzado |
| Interfaz web | Presentar los datos de forma intuitiva, validar las entradas y mostrar mensajes de error, manteniendo una presentación consistente. | Alcanzado |

## Enlace del video

https://drive.google.com/file/d/18MYhWwGLimCPA13qd5tM-ZzGyl6Tmb_Q/view?usp=sharing
