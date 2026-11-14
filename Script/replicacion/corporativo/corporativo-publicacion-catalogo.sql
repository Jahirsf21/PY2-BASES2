use WideWorldImporters;

if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;

-- ======================================================================================
-- (PUBLICACIÓN DEL CATÁLOGO HACIA LAS SUCURSALES)
-- ======================================================================================

/*
    Publica el catálogo de Corporativo y lo entrega a San José y Limón.
    Conserva los datos existentes de las sucursales como punto de partida.
    Requiere que el distribuidor local esté configurado y el catálogo coincida en los tres nodos.
*/
set nocount on;

if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') <> N'corporativo'
    throw 57001, 'El nodo indicado no corresponde a Corporativo.', 1;

if exists (select 1 from sys.databases where name = db_name() and is_published = 1)
    throw 57013, 'La base ya tiene una publicación.', 1;

if exists (
    select 1
    from sys.tables
    where schema_id = schema_id(N'Warehouse')
      and name in (N'StockItems', N'Colors', N'PackageTypes', N'StockGroups')
      and temporal_type <> 0
)
    throw 57014, 'El catálogo todavía tiene versionado temporal.', 1;

declare @PasswordCorporativo nvarchar(128) = N'';
declare @PasswordSanJose nvarchar(128) = N'';
declare @PasswordLimon nvarchar(128) = N'';

if len(coalesce(@PasswordCorporativo, N'')) = 0
    or len(coalesce(@PasswordSanJose, N'')) = 0
    or len(coalesce(@PasswordLimon, N'')) = 0
    throw 57007, 'Las contraseñas no pueden estar vacías.', 1;

begin try
    /*
        Habilita la base para publicar y crea el lector del registro.
    */
    exec sys.sp_replicationdboption
        @dbname = N'WideWorldImporters',
        @optname = N'publish',
        @value = N'true';

    exec sys.sp_addlogreader_agent
        @publisher_security_mode = 0,
        @publisher_login = N'sa',
        @publisher_password = @PasswordCorporativo;

    /*
        Crea la publicación transaccional.
    */
    exec sys.sp_addpublication
        @publication = N'Catalogo',
        @status = N'active',
        @independent_agent = N'true',
        @replicate_ddl = 0;

    /*
        Agrega las tablas del catálogo.
    */
    exec sys.sp_addarticle
        @publication = N'Catalogo',
        @article = N'Colors',
        @source_owner = N'Warehouse',
        @source_object = N'Colors',
        @destination_owner = N'Warehouse',
        @pre_creation_cmd = N'none';

    exec sys.sp_addarticle
        @publication = N'Catalogo',
        @article = N'PackageTypes',
        @source_owner = N'Warehouse',
        @source_object = N'PackageTypes',
        @destination_owner = N'Warehouse',
        @pre_creation_cmd = N'none';

    exec sys.sp_addarticle
        @publication = N'Catalogo',
        @article = N'StockGroups',
        @source_owner = N'Warehouse',
        @source_object = N'StockGroups',
        @destination_owner = N'Warehouse',
        @pre_creation_cmd = N'none';

    exec sys.sp_addarticle
        @publication = N'Catalogo',
        @article = N'StockItems',
        @source_owner = N'Warehouse',
        @source_object = N'StockItems',
        @destination_owner = N'Warehouse',
        @pre_creation_cmd = N'none';

    exec sys.sp_addarticle
        @publication = N'Catalogo',
        @article = N'StockItemStockGroups',
        @source_owner = N'Warehouse',
        @source_object = N'StockItemStockGroups',
        @destination_owner = N'Warehouse',
        @pre_creation_cmd = N'none';

    /*
        Suscribe a San José conservando sus datos existentes.
    */
    exec sys.sp_addsubscription
        @publication = N'Catalogo',
        @subscriber = N'san-jose',
        @destination_db = N'WideWorldImporters',
        @sync_type = N'replication support only';

    exec sys.sp_addpushsubscription_agent
        @publication = N'Catalogo',
        @subscriber = N'san-jose',
        @subscriber_db = N'WideWorldImporters',
        @subscriber_security_mode = 0,
        @subscriber_login = N'sa',
        @subscriber_password = @PasswordSanJose;

    /*
        Suscribe a Limón conservando sus datos existentes.
    */
    exec sys.sp_addsubscription
        @publication = N'Catalogo',
        @subscriber = N'limon',
        @destination_db = N'WideWorldImporters',
        @sync_type = N'replication support only';

    exec sys.sp_addpushsubscription_agent
        @publication = N'Catalogo',
        @subscriber = N'limon',
        @subscriber_db = N'WideWorldImporters',
        @subscriber_security_mode = 0,
        @subscriber_login = N'sa',
        @subscriber_password = @PasswordLimon;
end try
begin catch
    ;throw;
end catch;
