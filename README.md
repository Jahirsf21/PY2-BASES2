# PROYECTO 2 – BASES 2

**Institución:** Tecnológico de Costa Rica, Centro Académico de Limón  
**Curso:** Bases de Datos II  
**Grupo:** 60  
**Profesor:** Ing. Cristian Paz Campos Agüero  
**Semestre:** II Semestre 2026

## Estudiantes

| Nombre                   | Carnet     |
| ------------------------ | ---------- |
| Deislher Sanchez Funez   | 2023032794 |
| Natalia Granados Rosales | 2021144286 |

## Introducción

En este proyecto llevamos la aplicación del proyecto 1 a una base de datos distribuida de **WideWorldImporters** con tres nodos de SQL Server, cada uno en su propio contenedor Linux: las sucursales de **San José** y **Limón** y la oficina **Corporativa**. Incluye la aplicación web, una API REST que se conecta a los tres nodos, fragmentación horizontal y vertical, replicación transaccional, vistas materializadas para los reportes de Corporativo, control de concurrencia y contraseñas cifradas.

Existen dos roles de usuario:

- **Administrador:** inicia sesión en San José o Limón. Consulta clientes, proveedores, productos y facturas de su sucursal, y crea, modifica y elimina productos.
- **Corporativo:** inicia sesión en Corporativo y consulta las estadísticas de cada sucursal o consolidadas.

## Diseño distribuido

### Asignación de los nodos

| Nodo        | Hostname      | Responsabilidad                                                                                                        |
| ----------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| San José    | `san-jose`    | Facturación, compras y existencias propias de la sucursal.                                                             |
| Limón       | `limon`       | Facturación, compras y existencias propias de la sucursal.                                                             |
| Corporativo | `corporativo` | Escrituras del catálogo de productos, datos sensibles y copia de los documentos de ambas sucursales para los reportes. |

### Fragmentación horizontal

Cada factura y cada orden de compra pertenece a una sola sucursal. Repartimos los documentos del respaldo según la paridad de su identificador: San José se queda con los pares y Limón con los impares. Las líneas van con su cabecera, y los documentos nuevos se crean en la sucursal donde se emiten, sin chocar con los identificadores de la otra.

**Justificación:** cada sucursal maneja su propia facturación, así que cada una guarda solo sus documentos y puede consultarlos y crearlos sin depender de las demás ni de la red. Usamos la paridad porque WideWorldImporters no registra la sucursal de cada documento, y así repartimos el respaldo original sin perder ni duplicar documentos.

### Fragmentación vertical

Los datos generales de clientes, proveedores y personas están en los tres nodos. Las columnas sensibles (formas de contacto, cuentas, credenciales y datos privados) las movimos a tablas privadas en Corporativo y las quitamos de las sucursales. Cuando una sucursal muestra el detalle de un cliente o proveedor, consulta esos datos en Corporativo mediante un linked server.

**Justificación:** los datos sensibles quedan solo en Corporativo para proteger la privacidad de clientes y proveedores, y las sucursales los consultan cuando los necesitan. Si Corporativo no responde, el detalle sigue mostrando los datos generales locales y avisa en las secciones sensibles.

### Datos replicados y locales

| Datos                                             | Ubicación                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Catálogo de productos, grupos, colores y empaques | Los tres nodos. Corporativo es el único que escribe y lo replica a las sucursales. |
| Facturas, órdenes de compra y sus líneas          | Cada sucursal tiene las suyas y las replica a Corporativo.                         |
| Existencias (`StockItemHoldings`)                 | Locales e independientes en cada sucursal; no se replican.                         |
| Datos sensibles                                   | Solo en Corporativo.                                                               |
| Usuarios (`dbo.Users`)                            | Locales en cada nodo; no se replican.                                              |

**Justificación:** el catálogo es el mismo para todas las sucursales, así que centralizamos su escritura en Corporativo para evitar conflictos entre sucursales y se replica para que cada una lo consulte localmente. Los documentos los replicamos hacia Corporativo porque ahí se calculan las estadísticas por sucursal y consolidadas. Las existencias no se replican porque cada sucursal maneja su propio inventario.

## Requisitos

- [Node.js](https://nodejs.org/es/download) 22.13 o superior.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) con WSL y contenedores Linux.
- [SQL Server Management Studio (SSMS)](https://learn.microsoft.com/es-es/ssms/install/install).
- pnpm.
- Al menos 16 GB de memoria en el equipo, porque se ejecutan tres instancias de SQL Server.

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

### 2. Descargar y ejecutar los tres nodos

En PowerShell, descargue la imagen:

```powershell
docker pull mcr.microsoft.com/mssql/server:2025-latest
```

Cree los tres contenedores. Reemplace `TUCONTRASEÑA` por la contraseña que utilizará para `sa`; debe tener al menos ocho caracteres y combinar tres de estos cuatro grupos: mayúsculas, minúsculas, números y símbolos. El nombre del contenedor y el hostname deben ser exactamente `san-jose`, `limon` y `corporativo`, porque la API y los scripts identifican cada nodo por su hostname.

```powershell
docker run -e 'ACCEPT_EULA=Y' -e 'MSSQL_SA_PASSWORD=TUCONTRASEÑA' -p 1433:1433 --name san-jose --hostname san-jose -d mcr.microsoft.com/mssql/server:2025-latest
docker run -e 'ACCEPT_EULA=Y' -e 'MSSQL_SA_PASSWORD=TUCONTRASEÑA' -p 1434:1433 --name limon --hostname limon -d mcr.microsoft.com/mssql/server:2025-latest
docker run -e 'ACCEPT_EULA=Y' -e 'MSSQL_SA_PASSWORD=TUCONTRASEÑA' -p 1435:1433 --name corporativo --hostname corporativo -d mcr.microsoft.com/mssql/server:2025-latest
```

### 3. Habilitar el Agente SQL Server y la red

La replicación necesita el Agente SQL Server y que los contenedores puedan comunicarse por nombre:

```powershell
foreach ($nodo in "san-jose", "limon", "corporativo") {
    docker exec $nodo mkdir -p /var/opt/mssql/backup /var/opt/mssql/ReplData
    docker exec -u 0 $nodo chown mssql:mssql /var/opt/mssql/ReplData
    docker exec -u 0 $nodo /opt/mssql/bin/mssql-conf set sqlagent.enabled true
    docker restart $nodo
}
docker network create repl-net
docker network connect repl-net san-jose
docker network connect repl-net limon
docker network connect repl-net corporativo
```

### 4. Crear los alias de los nodos

Para conectarse desde SSMS hay que usar el nombre de cada nodo (`san-jose`, `limon` o `corporativo`) y no `localhost,puerto`. La replicación identifica a cada servidor por su nombre, así que si nos conectamos con `localhost,puerto` no se pueden crear correctamente los distribuidores. Los alias hacen que Windows resuelva esos nombres hacia el puerto de cada contenedor.

Presione **Win + R**, escriba lo siguiente y pulse **Aceptar**:

```text
C:\Windows\System32\cliconfg.exe
```

En la pestaña **Alias**, pulse **Agregar** y cree un alias por cada fila:

| Alias del servidor | Biblioteca de red | Nombre del servidor | Determinar puerto dinámicamente | Número de puerto |
| ------------------ | ----------------- | ------------------- | ------------------------------- | ---------------- |
| `san-jose`         | TCP/IP            | `127.0.0.1`         | Desmarcado                      | `1433`           |
| `limon`            | TCP/IP            | `127.0.0.1`         | Desmarcado                      | `1434`           |
| `corporativo`      | TCP/IP            | `127.0.0.1`         | Desmarcado                      | `1435`           |

Guarde cada alias con **Aceptar**, pulse **Aplicar** y cierre la herramienta. Si SSMS estaba abierto, ciérrelo y vuelva a abrirlo. Los alias solo sirven para conectarse desde Windows; entre contenedores la comunicación usa la red `repl-net`.

### 5. Conectar mediante SSMS

Abra una conexión a cada nodo usando su alias:

| Campo                    | San José                           | Limón                              | Corporativo                        |
| ------------------------ | ---------------------------------- | ---------------------------------- | ---------------------------------- |
| Server Name              | `san-jose`                         | `limon`                            | `corporativo`                      |
| Autenticación            | SQL Server Authentication          | SQL Server Authentication          | SQL Server Authentication          |
| Usuario                  | `sa`                               | `sa`                               | `sa`                               |
| Contraseña               | La definida al crear el contenedor | La definida al crear el contenedor | La definida al crear el contenedor |
| Trust server certificate | Activado                           | Activado                           | Activado                           |

### 6. Restaurar WideWorldImporters OLTP en los tres nodos

1. Descargue `WideWorldImporters-Full.bak` desde la [publicación oficial de WideWorldImporters](https://github.com/Microsoft/sql-server-samples/releases/tag/wide-world-importers-v1.0). Este es el respaldo OLTP utilizado por el proyecto.
2. Copie el respaldo a los tres contenedores. El siguiente ejemplo supone que está en la carpeta **Downloads**; ajuste la ruta si lo descargó en otra ubicación:

   ```powershell
   $backup = "$env:USERPROFILE\Downloads\WideWorldImporters-Full.bak"
   docker cp "$backup" san-jose:/var/opt/mssql/backup/WideWorldImporters-Full.bak
   docker cp "$backup" limon:/var/opt/mssql/backup/WideWorldImporters-Full.bak
   docker cp "$backup" corporativo:/var/opt/mssql/backup/WideWorldImporters-Full.bak
   ```

3. En SSMS, conectado a `san-jose`, haga clic derecho en **Databases** y seleccione **Restore Database...**.
4. En **Source**, seleccione **Device** y agregue `/var/opt/mssql/backup/WideWorldImporters-Full.bak`. Establezca **WideWorldImporters** como nombre de la base de destino.
5. Verifique que el respaldo esté marcado en **Backup sets to restore** y ejecute la restauración.
6. Repita los pasos 3 a 5 en `limon` y en `corporativo`.
7. En cada nodo, ejecute una vez este bloque, requerido por la replicación en Linux:

   ```sql
   USE msdb;
   GO
   EXEC sys.sp_MSrepl_createdatatypemappings;
   GO
   ```

## Dependencias

El backend utiliza Node.js, `express`, `mssql`, `dotenv`, `cors`, `jsonwebtoken` y `zod` para exponer la API, autenticar a los usuarios, validar las solicitudes y conectarse a los tres nodos de SQL Server.

El frontend utiliza Next.js, React y TypeScript, con componentes de shadcn, estilos de Tailwind CSS e iconos de Lucide React.

Las dependencias se instalan con `pnpm install` en cada proyecto, como se muestra en los comandos de arranque.

## Configuración de variables de entorno

### Backend

Cree el archivo `proyectos/Api/.env.local` y complete las credenciales de los tres nodos:

```env
DB_NAME=WideWorldImporters
DB_HOST=localhost
DB_PORT_SAN_JOSE=1433
DB_USER_SAN_JOSE=sa
DB_PASSWORD_SAN_JOSE=TUCONTRASEÑA
DB_PORT_LIMON=1434
DB_USER_LIMON=sa
DB_PASSWORD_LIMON=TUCONTRASEÑA
DB_PORT_CORPORATIVO=1435
DB_USER_CORPORATIVO=sa
DB_PASSWORD_CORPORATIVO=TUCONTRASEÑA
API_PORT=3002
APP_PORT=3000
JWT_SECRET=UNA_CLAVE_LARGA_Y_ALEATORIA
```

Cada `DB_PASSWORD_*` debe coincidir con la contraseña de su contenedor y cada `DB_PORT_*` con el puerto publicado. `JWT_SECRET` firma las sesiones; la API no inicia si está vacío. `APP_PORT` debe coincidir con el puerto del frontend, porque la API permite solicitudes desde `http://localhost:APP_PORT` mediante CORS.

### Frontend

Cree el archivo `proyectos/WebSite/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

La URL debe coincidir con `API_PORT` y no debe terminar en `/api`.

## Ejecutar los scripts SQL

### Antes de ejecutar

Por seguridad, dejamos vacías (`N''`) las contraseñas de los scripts. Complételas antes de ejecutar cada archivo:

| Script                                                                                                  | Contraseñas que debe completar                                                                                                   |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [users.sql](Script/users.sql)                                                                           | La frase de paso `@Passphrase` (en los dos lugares donde aparece, con el mismo valor) y la contraseña de cada usuario de prueba. |
| [sucursales-enlace-corporativo.sql](Script/fragmentacion/corporativo/sucursales-enlace-corporativo.sql) | La contraseña de `sa` en Corporativo.                                                                                            |
| Los cuatro scripts de [replicacion](Script/replicacion)                                                 | La contraseña de `sa` de cada nodo indicado en el script.                                                                        |

Los scripts de enlace y replicación, y la carga de usuarios de `users.sql`, se detienen con un error si la contraseña queda vacía. Use en `users.sql` la misma frase de paso en ambos lugares; de lo contrario, el inicio de sesión no podrá descifrar las contraseñas.

### Orden de ejecución

En SSMS, abra una **Nueva consulta** en el nodo indicado, seleccione la base `WideWorldImporters` y ejecute todo el contenido de cada archivo, en este orden. «Sucursales» significa ejecutar el script en San José y después en Limón. Cada script comprueba que se ejecute en el nodo correcto.

| Orden | Nodo        | Script                                                                                                                                                                                                                                                                                                             | Contenido                                                                                         |
| ----- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 1     | Los tres    | [synonyms.sql](Script/synonyms.sql)                                                                                                                                                                                                                                                                                | Sinónimos para las tablas utilizadas por los procedimientos.                                      |
| 2     | Los tres    | [users.sql](Script/users.sql)                                                                                                                                                                                                                                                                                      | Tabla de usuarios con contraseña cifrada, usuario de prueba del nodo e inicio de sesión.          |
| 3     | Corporativo | [corporativo-datos-privados.sql](Script/fragmentacion/corporativo/corporativo-datos-privados.sql)                                                                                                                                                                                                                  | Tablas privadas con los datos sensibles.                                                          |
| 4     | Corporativo | [corporativo-acceso-datos-privados.sql](Script/fragmentacion/corporativo/corporativo-acceso-datos-privados.sql)                                                                                                                                                                                                    | Vistas de datos sensibles que consultan las sucursales.                                           |
| 5     | Sucursales  | [sucursales-enlace-corporativo.sql](Script/fragmentacion/corporativo/sucursales-enlace-corporativo.sql)                                                                                                                                                                                                            | Linked server hacia Corporativo.                                                                  |
| 6     | Sucursales  | [application.sql](Script/application.sql), [customers.sql](Script/customers.sql), [suppliers.sql](Script/suppliers.sql), [inventory.sql](Script/inventory.sql) y [sales.sql](Script/sales.sql)                                                                                                                     | Procedimientos de los módulos; clientes y proveedores leen los datos sensibles de Corporativo.    |
| 7     | Corporativo | [inventory.sql](Script/inventory.sql)                                                                                                                                                                                                                                                                              | Grupos de productos que usan el inventario y los filtros de los reportes.                         |
| 8     | Sucursales  | [sucursales-retiro-datos-privados.sql](Script/fragmentacion/sucursales/sucursales-retiro-datos-privados.sql)                                                                                                                                                                                                       | Retira las columnas sensibles de las sucursales.                                                  |
| 9     | Sucursales  | [sucursales-fragmentacion-documentos.sql](Script/fragmentacion/sucursales/sucursales-fragmentacion-documentos.sql)                                                                                                                                                                                                 | Conserva los documentos pares en San José y los impares en Limón.                                 |
| 10    | Los tres    | [versionado-temporal-tablas.sql](Script/replicacion/versionado-temporal-tablas.sql)                                                                                                                                                                                                                                | Prepara las tablas del catálogo para la replicación.                                              |
| 11    | Corporativo | [corporativo-distribuidor.sql](Script/replicacion/corporativo/corporativo-distribuidor.sql)                                                                                                                                                                                                                        | Distribuidor local de Corporativo.                                                                |
| 12    | Sucursales  | [sucursales-distribuidor-local.sql](Script/replicacion/sucursales/sucursales-distribuidor-local.sql)                                                                                                                                                                                                               | Distribuidor local de cada sucursal.                                                              |
| 13    | Corporativo | [corporativo-publicacion-catalogo.sql](Script/replicacion/corporativo/corporativo-publicacion-catalogo.sql)                                                                                                                                                                                                        | Publica el catálogo hacia San José y Limón.                                                       |
| 14    | Sucursales  | [sucursales-publicacion-documentos.sql](Script/replicacion/sucursales/sucursales-publicacion-documentos.sql)                                                                                                                                                                                                       | Publica las facturas y compras hacia Corporativo.                                                 |
| 15    | Corporativo | [corporativo-version-catalogo.sql](Script/catalogo/corporativo/corporativo-version-catalogo.sql), [corporativo-catalogo-central.sql](Script/catalogo/corporativo/corporativo-catalogo-central.sql) y [corporativo-eliminacion-productos.sql](Script/catalogo/corporativo/corporativo-eliminacion-productos.sql)    | Versión de cada producto y procedimientos para crear, editar y eliminar productos en Corporativo. |
| 16    | Sucursales  | [sucursales-version-existencias.sql](Script/catalogo/sucursales/sucursales-version-existencias.sql), [sucursales-eliminacion-productos.sql](Script/catalogo/sucursales/sucursales-eliminacion-productos.sql) y [sucursales-existencias-locales.sql](Script/catalogo/sucursales/sucursales-existencias-locales.sql) | Versión de las existencias, bloqueo de productos en eliminación y ajuste de existencias locales.  |
| 17    | Corporativo | [vistas-materializadas.sql](Script/vistas%20materializadas/vistas-materializadas.sql)                                                                                                                                                                                                                              | Vistas indexadas con los totales de los reportes.                                                 |
| 18    | Corporativo | [stats.sql](Script/stats.sql)                                                                                                                                                                                                                                                                                      | Reportes por sucursal o consolidados y años disponibles para sus filtros.                         |

Los scripts que modifican la estructura o los datos de la base (fragmentación, replicación, versiones y vistas materializadas) se ejecutan **una sola vez**. Los que solo crean o actualizan procedimientos pueden volver a ejecutarse.

## Levantar el proyecto

Ejecute los siguientes comandos desde la raíz del repositorio, después de restaurar las bases de datos, ejecutar los scripts y configurar los archivos `.env.local`.

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

### Iniciar sesión

En la pantalla de inicio de sesión, seleccione el nodo e ingrese el usuario de prueba creado por `users.sql` en ese nodo:

| Nodo        | Usuario       | Rol           |
| ----------- | ------------- | ------------- |
| San José    | `admin_sj`    | Administrador |
| Limón       | `admin_limon` | Administrador |
| Corporativo | `corporativo` | Corporativo   |

La contraseña es la que definió para cada usuario en `users.sql`.

## Estado del proyecto 1,5

Se alcanzaron todos los requerimientos del enunciado del proyecto 2. Del proyecto 1 mantenemos los módulos y los ocho reportes implementados; los reportes 9 y 10 siguen sin implementarse.

| Área                           | Objetivo                                                                                                                                                                         | Estado           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Infraestructura                | Tres nodos de SQL Server en contenedores independientes: San José, Limón y Corporativo.                                                                                          | Alcanzado        |
| Roles de usuario               | Administrador en las sucursales y Corporativo en la oficina corporativa, validados en la API y en SQL Server.                                                                    | Alcanzado        |
| Tabla de usuarios              | Tabla `dbo.Users` con identificador, usuario, contraseña, nombre completo, estado, rol, correo y fecha de contratación.                                                          | Alcanzado        |
| Seguridad                      | Relacionar el usuario de la aplicación con la base de datos: cada procedimiento recibe el usuario de la sesión y comprueba que esté activo y tenga el rol permitido en ese nodo. | Alcanzado        |
| Encriptación                   | Contraseña cifrada con `EncryptByPassPhrase` y verificada con `DecryptByPassPhrase`, funciones nativas de SQL Server.                                                            | Alcanzado        |
| Fragmentación horizontal       | Facturas, órdenes de compra y sus líneas repartidas entre San José y Limón.                                                                                                      | Alcanzado        |
| Fragmentación vertical         | Datos sensibles de clientes, proveedores y personas solo en Corporativo, consultados desde las sucursales mediante un linked server.                                             | Alcanzado        |
| Replicación                    | Replicación transaccional del catálogo de Corporativo a las sucursales y de los documentos de cada sucursal a Corporativo.                                                       | Alcanzado        |
| Catálogo de productos          | Crear, modificar y eliminar productos en Corporativo y replicar los cambios a todas las bases de datos; existencias independientes por sucursal.                                 | Alcanzado        |
| Concurrencia                   | Control de versión al editar productos y existencias (respuesta `409` si otro usuario los cambió) y bloqueo del producto en las sucursales mientras se elimina.                  | Alcanzado        |
| Vistas materializadas          | Tres vistas indexadas en Corporativo con los totales de facturas, ventas por producto y órdenes de compra, utilizadas por seis reportes.                                         | Alcanzado        |
| Filtro de estadísticas         | Selección de sucursal (San José, Limón o consolidado) en los ocho reportes.                                                                                                      | Alcanzado        |
| Respuesta ante fallas          | Si un nodo no responde, la API devuelve `503` con un mensaje y la operación puede reintentarse desde la web; una sucursal sin Corporativo sigue mostrando los datos generales.   | Alcanzado        |
| Funcionalidades del proyecto 1 | Módulos de clientes, proveedores, inventario y ventas, y reportes 1 a 8.                                                                                                         | Alcanzado        |
| Reportes 9 y 10 del proyecto 1 | Rotación de inventario y método de envío favorito por destino.                                                                                                                   | **No alcanzado** |