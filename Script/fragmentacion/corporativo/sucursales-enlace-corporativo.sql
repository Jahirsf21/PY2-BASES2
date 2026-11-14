use WideWorldImporters;

if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;

-- ======================================================================================
-- (ENLACE A CORPORATIVO)
-- ======================================================================================

/*
    Crea el enlace de las sucursales a Corporativo.
    Requiere que el enlace no exista.
*/
set nocount on;

if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') not in (N'san-jose', N'limon')
    throw 57001, 'El nodo indicado no corresponde a una sucursal.', 1;

if exists (select 1 from sys.servers where name = N'CORPORATIVO')
    throw 57006, 'El enlace indicado ya existe.', 1;

declare @PasswordCorporativo nvarchar(128) = N'';

if @PasswordCorporativo is null or len(@PasswordCorporativo) = 0
    throw 57007, 'La contraseña de Corporativo no puede estar vacía.', 1;

begin try
    exec master.dbo.sp_addlinkedserver
        @server = N'CORPORATIVO',
        @srvproduct = N'',
        @provider = N'MSOLEDBSQL',
        @datasrc = N'corporativo,1433',
        @catalog = N'WideWorldImporters',
        @provstr = N'Encrypt=Optional';

    exec master.dbo.sp_addlinkedsrvlogin
        @rmtsrvname = N'CORPORATIVO',
        @useself = N'false',
        @locallogin = N'sa',
        @rmtuser = N'sa',
        @rmtpassword = @PasswordCorporativo;
end try
begin catch
    ;throw;
end catch;
