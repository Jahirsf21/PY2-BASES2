use WideWorldImporters;
go
if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;
go

-- ======================================================================================
-- Crea las tablas con los datos sensibles de clientes, proveedores y personas, y las llena
-- con una copia de los datos actuales.
-- ======================================================================================

if convert(nvarchar(128), serverproperty('MachineName')) <> N'corporativo'
    throw 50001, N'Este script solo se ejecuta en el nodo corporativo.', 1;
go

/*
    Datos sensibles de los clientes: contactos, teléfonos, sitio web, direcciones y ubicación.
    Comparte la clave primaria con Sales.Customers (relación 1 a 1).
*/
if object_id(N'Sales.CustomerPrivate', N'U') is null
    begin
        create table Sales.CustomerPrivate (
            CustomerID int not null,
            PrimaryContactPersonID int not null,
            AlternateContactPersonID int null,
            PhoneNumber nvarchar(20) not null,
            FaxNumber nvarchar(20) not null,
            WebsiteURL nvarchar(256) not null,
            DeliveryAddressLine1 nvarchar(60) not null,
            DeliveryAddressLine2 nvarchar(60) null,
            DeliveryPostalCode nvarchar(10) not null,
            DeliveryLocation geography null,
            PostalAddressLine1 nvarchar(60) not null,
            PostalAddressLine2 nvarchar(60) null,
            PostalCityID int not null,
            PostalPostalCode nvarchar(10) not null,
            constraint PK_Sales_CustomerPrivate primary key (CustomerID),
            constraint FK_Sales_CustomerPrivate_CustomerID foreign key (CustomerID) references Sales.Customers (CustomerID),
            constraint FK_Sales_CustomerPrivate_PrimaryContactPersonID foreign key (PrimaryContactPersonID) references Application.People (PersonID),
            constraint FK_Sales_CustomerPrivate_AlternateContactPersonID foreign key (AlternateContactPersonID) references Application.People (PersonID),
            constraint FK_Sales_CustomerPrivate_PostalCityID foreign key (PostalCityID) references Application.Cities (CityID)
        )
    end
go

/*
    Datos sensibles de los proveedores: contactos, teléfonos, sitio web, datos bancarios,
    comentarios internos, direcciones y ubicación.
*/
if object_id(N'Purchasing.SupplierPrivate', N'U') is null
    begin
        create table Purchasing.SupplierPrivate (
            SupplierID int not null,
            PrimaryContactPersonID int not null,
            AlternateContactPersonID int not null,
            PhoneNumber nvarchar(20) not null,
            FaxNumber nvarchar(20) not null,
            WebsiteURL nvarchar(256) not null,
            BankAccountName nvarchar(50) null,
            BankAccountBranch nvarchar(50) null,
            BankAccountCode nvarchar(20) null,
            BankAccountNumber nvarchar(20) null,
            BankInternationalCode nvarchar(20) null,
            InternalComments nvarchar(max) null,
            DeliveryAddressLine1 nvarchar(60) not null,
            DeliveryAddressLine2 nvarchar(60) null,
            DeliveryPostalCode nvarchar(10) not null,
            DeliveryLocation geography null,
            PostalAddressLine1 nvarchar(60) not null,
            PostalAddressLine2 nvarchar(60) null,
            PostalCityID int not null,
            PostalPostalCode nvarchar(10) not null,
            constraint PK_Purchasing_SupplierPrivate primary key (SupplierID),
            constraint FK_Purchasing_SupplierPrivate_SupplierID foreign key (SupplierID) references Purchasing.Suppliers (SupplierID),
            constraint FK_Purchasing_SupplierPrivate_PrimaryContactPersonID foreign key (PrimaryContactPersonID) references Application.People (PersonID),
            constraint FK_Purchasing_SupplierPrivate_AlternateContactPersonID foreign key (AlternateContactPersonID) references Application.People (PersonID),
            constraint FK_Purchasing_SupplierPrivate_PostalCityID foreign key (PostalCityID) references Application.Cities (CityID)
        )
    end
go

/*
    Datos sensibles de las personas (contactos y empleados): teléfonos, correo, foto y
    credenciales del sitio web original de WideWorldImporters.
*/
if object_id(N'Application.PeoplePrivate', N'U') is null
    begin
        create table Application.PeoplePrivate (
            PersonID int not null,
            PhoneNumber nvarchar(20) null,
            FaxNumber nvarchar(20) null,
            EmailAddress nvarchar(256) null,
            LogonName nvarchar(50) null,
            HashedPassword varbinary(max) null,
            Photo varbinary(max) null,
            constraint PK_Application_PeoplePrivate primary key (PersonID),
            constraint FK_Application_PeoplePrivate_PersonID foreign key (PersonID) references Application.People (PersonID)
        )
    end
go

/*
    Copia los datos sensibles actuales a las tablas nuevas en una sola transacción.
    Solo inserta las filas que aún no están copiadas, por lo que puede repetirse.
*/
set xact_abort on;

begin try
    begin transaction;

        insert into Application.PeoplePrivate (PersonID, PhoneNumber, FaxNumber, EmailAddress, LogonName, HashedPassword, Photo)
        select p.PersonID, p.PhoneNumber, p.FaxNumber, p.EmailAddress, p.LogonName, p.HashedPassword, p.Photo
        from Application.People p
        where not exists (select 1 from Application.PeoplePrivate pp where pp.PersonID = p.PersonID);

        insert into Sales.CustomerPrivate (
            CustomerID, PrimaryContactPersonID, AlternateContactPersonID, PhoneNumber, FaxNumber, WebsiteURL,
            DeliveryAddressLine1, DeliveryAddressLine2, DeliveryPostalCode, DeliveryLocation,
            PostalAddressLine1, PostalAddressLine2, PostalCityID, PostalPostalCode
        )
        select
            c.CustomerID, c.PrimaryContactPersonID, c.AlternateContactPersonID, c.PhoneNumber, c.FaxNumber, c.WebsiteURL,
            c.DeliveryAddressLine1, c.DeliveryAddressLine2, c.DeliveryPostalCode, c.DeliveryLocation,
            c.PostalAddressLine1, c.PostalAddressLine2, c.PostalCityID, c.PostalPostalCode
        from Sales.Customers c
        where not exists (select 1 from Sales.CustomerPrivate cp where cp.CustomerID = c.CustomerID);

        insert into Purchasing.SupplierPrivate (
            SupplierID, PrimaryContactPersonID, AlternateContactPersonID, PhoneNumber, FaxNumber, WebsiteURL,
            BankAccountName, BankAccountBranch, BankAccountCode, BankAccountNumber, BankInternationalCode, InternalComments,
            DeliveryAddressLine1, DeliveryAddressLine2, DeliveryPostalCode, DeliveryLocation,
            PostalAddressLine1, PostalAddressLine2, PostalCityID, PostalPostalCode
        )
        select
            s.SupplierID, s.PrimaryContactPersonID, s.AlternateContactPersonID, s.PhoneNumber, s.FaxNumber, s.WebsiteURL,
            s.BankAccountName, s.BankAccountBranch, s.BankAccountCode, s.BankAccountNumber, s.BankInternationalCode, s.InternalComments,
            s.DeliveryAddressLine1, s.DeliveryAddressLine2, s.DeliveryPostalCode, s.DeliveryLocation,
            s.PostalAddressLine1, s.PostalAddressLine2, s.PostalCityID, s.PostalPostalCode
        from Purchasing.Suppliers s
        where not exists (select 1 from Purchasing.SupplierPrivate sp where sp.SupplierID = s.SupplierID);

    commit transaction;
end try
begin catch
    if @@trancount > 0
        rollback transaction;
    throw;
end catch;
go

/*
    Verificación: cada tabla privada debe tener exactamente las mismas filas que su tabla
    original. Si alguna columna "Faltantes" es distinta de 0, no continuar con los demás scripts.
*/
select N'Personas' as Tabla,
       (select count(*) from Application.People) as Originales,
       (select count(*) from Application.PeoplePrivate) as Copiadas,
       (select count(*) from Application.People p where not exists (select 1 from Application.PeoplePrivate x where x.PersonID = p.PersonID)) as Faltantes
union all
select N'Clientes',
       (select count(*) from Sales.Customers),
       (select count(*) from Sales.CustomerPrivate),
       (select count(*) from Sales.Customers c where not exists (select 1 from Sales.CustomerPrivate x where x.CustomerID = c.CustomerID))
union all
select N'Proveedores',
       (select count(*) from Purchasing.Suppliers),
       (select count(*) from Purchasing.SupplierPrivate),
       (select count(*) from Purchasing.Suppliers s where not exists (select 1 from Purchasing.SupplierPrivate x where x.SupplierID = s.SupplierID));
go
