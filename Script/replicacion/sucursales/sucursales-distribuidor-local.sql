use master;

-- ======================================================================================
-- (DISTRIBUIDOR LOCAL DE LAS SUCURSALES)
-- ======================================================================================

/*
    Configura la sucursal como su propio distribuidor y crea la base distribution.
    Requiere que el distribuidor no exista y que el Agente SQL Server esté en ejecución.
*/
set nocount on;

declare @Node nvarchar(128) = coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'');

if @Node not in (N'san-jose', N'limon')
    throw 57001, 'El nodo indicado no corresponde a una sucursal.', 1;

if exists (select 1 from sys.servers where is_distributor = 1)
    or exists (select 1 from sys.databases where name = N'distribution')
    throw 57013, 'El distribuidor ya existe.', 1;

declare @PasswordSucursal nvarchar(128) =
    case when @Node = N'san-jose' then N'Jahirsf21!sanjose' else N'Jahirsf21!limon' end;

if len(coalesce(@PasswordSucursal, N'')) = 0
    throw 57007, 'La contraseña de la sucursal no puede estar vacía.', 1;

begin try
    /*
        Registra el distribuidor local con contraseña interna automática y crea su base de metadatos.
    */
    exec sys.sp_adddistributor
        @distributor = @Node,
        @trust_distributor_certificate = N'yes';

    exec sys.sp_adddistributiondb
        @database = N'distribution',
        @security_mode = 0,
        @login = N'sa',
        @password = @PasswordSucursal;

    /*
        Autoriza únicamente a la sucursal como publicador de su distribuidor local.
    */
    exec sys.sp_adddistpublisher
        @publisher = @Node,
        @distribution_db = N'distribution',
        @security_mode = 0,
        @login = N'sa',
        @password = @PasswordSucursal,
        @working_directory = N'/var/opt/mssql/ReplData';
end try
begin catch
    ;throw;
end catch;
