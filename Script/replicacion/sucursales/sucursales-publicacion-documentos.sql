use WideWorldImporters;

if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;

-- ======================================================================================
-- (PUBLICACIÓN DE FACTURAS Y COMPRAS HACIA CORPORATIVO)
-- ======================================================================================

/*
    Publica las facturas y compras de la sucursal y las entrega a Corporativo.
    Conserva los datos existentes de Corporativo como punto de partida.
    Requiere que la sucursal tenga configurado su distribuidor local.
    Requiere que los documentos de la sucursal coincidan con los de Corporativo.
*/
set nocount on;

if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') not in (N'san-jose', N'limon')
    throw 57001, 'El nodo indicado no corresponde a una sucursal.', 1;

if exists (select 1 from sys.databases where name = db_name() and is_published = 1)
    throw 57013, 'La base ya tiene una publicación.', 1;

declare @PasswordSucursal nvarchar(128) =
    case when convert(nvarchar(128), serverproperty('MachineName')) = N'san-jose' then N'Jahirsf21!sanjose' else N'Jahirsf21!limon' end;
declare @PasswordCorporativo nvarchar(128) = N'Jahirsf21!corporativo';

if len(coalesce(@PasswordSucursal, N'')) = 0
    or len(coalesce(@PasswordCorporativo, N'')) = 0
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
        @publisher_password = @PasswordSucursal;

    /*
        Crea la publicación transaccional.
    */
    exec sys.sp_addpublication
        @publication = N'Documentos',
        @status = N'active',
        @independent_agent = N'true',
        @replicate_ddl = 0;

    /*
        Agrega las cabeceras y sus líneas.
    */
    exec sys.sp_addarticle
        @publication = N'Documentos',
        @article = N'Invoices',
        @source_owner = N'Sales',
        @source_object = N'Invoices',
        @destination_owner = N'Sales',
        @pre_creation_cmd = N'none';

    exec sys.sp_addarticle
        @publication = N'Documentos',
        @article = N'InvoiceLines',
        @source_owner = N'Sales',
        @source_object = N'InvoiceLines',
        @destination_owner = N'Sales',
        @pre_creation_cmd = N'none';

    exec sys.sp_addarticle
        @publication = N'Documentos',
        @article = N'PurchaseOrders',
        @source_owner = N'Purchasing',
        @source_object = N'PurchaseOrders',
        @destination_owner = N'Purchasing',
        @pre_creation_cmd = N'none';

    exec sys.sp_addarticle
        @publication = N'Documentos',
        @article = N'PurchaseOrderLines',
        @source_owner = N'Purchasing',
        @source_object = N'PurchaseOrderLines',
        @destination_owner = N'Purchasing',
        @pre_creation_cmd = N'none';

    /*
        Suscribe a Corporativo conservando sus datos existentes.
    */
    exec sys.sp_addsubscription
        @publication = N'Documentos',
        @subscriber = N'corporativo',
        @destination_db = N'WideWorldImporters',
        @sync_type = N'replication support only';

    exec sys.sp_addpushsubscription_agent
        @publication = N'Documentos',
        @subscriber = N'corporativo',
        @subscriber_db = N'WideWorldImporters',
        @subscriber_security_mode = 0,
        @subscriber_login = N'sa',
        @subscriber_password = @PasswordCorporativo;
end try
begin catch
    ;throw;
end catch;
