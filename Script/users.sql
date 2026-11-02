use WideWorldImporters;
go
if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;
go

-- ======================================================================================
-- USUARIOS
-- ======================================================================================

/*
    Crea la tabla de usuarios de la aplicación si todavía no existe.
    Define un identificador autoincremental, nombres de usuario y correos únicos,
    y establece que los usuarios estén activos por defecto.
    Si la tabla ya existe, conserva su estructura y sus datos.
*/
if object_id(N'dbo.Users', N'U') is null
    begin
        create table dbo.Users (
            UserID int identity(1, 1) not null,
            UserName nvarchar(50) not null,
            [Password] varbinary(8000) not null,
            FullName nvarchar(150) not null,
            Active bit not null constraint DF_Users_Active default (1),
            Rol nvarchar(50) not null,
            Email nvarchar(254) not null,
            HireDate date not null,
            constraint PK_Users primary key (UserID),
            constraint UQ_Users_UserName unique (UserName),
            constraint UQ_Users_Email unique (Email)
        )
    end
go

/*
    Inserta los usuarios de prueba correspondientes al hostname de esta instancia.
    En los contenedores, SERVERPROPERTY('MachineName') debe coincidir con el valor definido mediante --hostname: san-jose, limon o corporativo.
    No modifica usuarios existentes si coincide el nombre de usuario o el correo.
*/
declare @InstanceName nvarchar(128) = convert(nvarchar(128), serverproperty('MachineName'));

-- Frase de paso para cifrar las contraseñas; debe coincidir con la usada en dbo.LoginUser.
declare @Passphrase nvarchar(100) = N'hGkxrd6gfl5oECcRkZoTUiB8ITcsuEzqSnA17kqXhDh';

if @InstanceName is null or @InstanceName not in (N'san-jose', N'limon', N'corporativo')
begin
    ;throw 50001, N'Hostname de SQL Server no reconocido. Se esperaba san-jose, limon o corporativo.', 1;
end;

if @InstanceName = N'san-jose'
begin
    insert into dbo.Users (UserName, [Password], FullName, Rol, Email, HireDate)
    select v.UserName, EncryptByPassPhrase(@Passphrase, v.Password), v.FullName, v.Rol, v.Email, cast(getdate() as date)
    from (values
        (N'admin_sj', N'Admin123!', N'Administrador de San José', N'Administrador', N'admin.sj@example.com')
    ) as v(UserName, [Password], FullName, Rol, Email)
    where not exists (
        select 1 from dbo.Users u
        where u.UserName = v.UserName or u.Email = v.Email
    );
end;

if @InstanceName = N'limon'
begin
    insert into dbo.Users (UserName, [Password], FullName, Rol, Email, HireDate)
    select v.UserName, EncryptByPassPhrase(@Passphrase, v.Password), v.FullName, v.Rol, v.Email, cast(getdate() as date)
    from (values
        (N'admin_limon', N'Admin123!', N'Administrador de Limón', N'Administrador', N'admin.limon@example.com')
    ) as v(UserName, [Password], FullName, Rol, Email)
    where not exists (
        select 1 from dbo.Users u
        where u.UserName = v.UserName or u.Email = v.Email
    );
end;

if @InstanceName = N'corporativo'
begin
    insert into dbo.Users (UserName, [Password], FullName, Rol, Email, HireDate)
    select v.UserName, EncryptByPassPhrase(@Passphrase, v.Password), v.FullName, v.Rol, v.Email, cast(getdate() as date)
    from (values
        (N'corporativo', N'Corporativo123!', N'Usuario Corporativo de prueba', N'Corporativo', N'corporativo@example.com')
    ) as v(UserName, [Password], FullName, Rol, Email)
    where not exists (
        select 1 from dbo.Users u
        where u.UserName = v.UserName or u.Email = v.Email
    );
end;
GO

/*
    Comprueba las credenciales de un usuario activo descifrando la contraseña almacenada.
    No devuelve filas si las credenciales no coinciden o el usuario está inactivo.
    Devuelve: UserID, UserName, FullName, Rol, Active
*/
create or alter procedure dbo.LoginUser
    @UserName nvarchar(50),
    @Password nvarchar(255)
as
begin
    set nocount on;

    -- Debe ser la misma frase de paso usada al cifrar las contraseñas.
    declare @Passphrase nvarchar(100) = N'hGkxrd6gfl5oECcRkZoTUiB8ITcsuEzqSnA17kqXhDh';

    select
        UserID,
        UserName,
        FullName,
        Rol,
        Active
    from dbo.Users
    where UserName = @UserName
      and convert(nvarchar(255), DecryptByPassPhrase(@Passphrase, [Password])) = @Password
      and Active = 1;
end
go
