use master;

-- ======================================================================================
-- (DISTRIBUIDOR LOCAL EN CORPORATIVO)
-- ======================================================================================

/*
    Configura Corporativo como su propio distribuidor y crea la base distribution.
    Requiere que el distribuidor no exista y que el Agente SQL Server esté en ejecución.
*/
set nocount on;

if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') <> N'corporativo'
    throw 57001, 'El nodo indicado no corresponde a Corporativo.', 1;

if exists (select 1 from sys.servers where is_distributor = 1)
    or exists (select 1 from sys.databases where name = N'distribution')
    throw 57013, 'El distribuidor ya existe.', 1;

declare @PasswordCorporativo nvarchar(128) = N'';

if len(coalesce(@PasswordCorporativo, N'')) = 0
    throw 57007, 'La contraseña de Corporativo no puede estar vacía.', 1;

begin try
    /*
        Registra el distribuidor local con contraseña interna automática y crea su base de metadatos.
    */
    exec sys.sp_adddistributor
        @distributor = N'corporativo',
        @trust_distributor_certificate = N'yes';

    exec sys.sp_adddistributiondb
        @database = N'distribution',
        @security_mode = 0,
        @login = N'sa',
        @password = @PasswordCorporativo;

    /*
        Autoriza únicamente a Corporativo como publicador de su distribuidor local.
    */
    exec sys.sp_adddistpublisher
        @publisher = N'corporativo',
        @distribution_db = N'distribution',
        @security_mode = 0,
        @login = N'sa',
        @password = @PasswordCorporativo,
        @working_directory = N'/var/opt/mssql/ReplData';
end try
begin catch
    ;throw;
end catch;
