use WideWorldImporters;
go

if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;

-- ======================================================================================
-- (VISTAS DE DATOS SENSIBLES)
-- ======================================================================================

/*
    Crea las vistas de datos sensibles en Corporativo.
    Requiere que las tablas privadas existan y las vistas no existan.
*/
set nocount on;

if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') <> N'corporativo'
    throw 57001, 'El nodo indicado no corresponde a Corporativo.', 1;

if object_id(N'Application.PeoplePrivate', N'U') is null
    or object_id(N'Sales.CustomerPrivate', N'U') is null
    or object_id(N'Purchasing.SupplierPrivate', N'U') is null
    throw 57004, 'Una o más tablas privadas no existen.', 1;

if object_id(N'Application.v_PeoplePrivate') is not null
    or object_id(N'Sales.v_CustomerPrivate') is not null
    or object_id(N'Purchasing.v_SupplierPrivate') is not null
    throw 57005, 'Una o más vistas privadas ya existen.', 1;
go

/*
    Obtiene los datos de contacto de las personas almacenados en Corporativo.
*/
create view Application.v_PeoplePrivate
as
    select
        pp.PersonID,
        pp.PhoneNumber,
        pp.FaxNumber,
        pp.EmailAddress
    from Application.PeoplePrivate pp;
go

/*
    Obtiene los datos sensibles de los clientes almacenados en Corporativo.
*/
create view Sales.v_CustomerPrivate
as
    select
        cs.CustomerID,
        cs.PrimaryContactPersonID,
        cs.AlternateContactPersonID,
        cs.CreditLimit,
        cs.PhoneNumber,
        cs.FaxNumber,
        cs.WebsiteURL,
        cs.DeliveryAddressLine1,
        cs.DeliveryAddressLine2,
        cs.DeliveryPostalCode,
        cs.DeliveryLocation.Lat as Latitud,
        cs.DeliveryLocation.Long as Longitud,
        cs.PostalAddressLine1,
        cs.PostalAddressLine2,
        cs.PostalCityID,
        cs.PostalPostalCode
    from Sales.CustomerPrivate cs;
go

/*
    Obtiene los datos sensibles de los proveedores almacenados en Corporativo.
*/
create view Purchasing.v_SupplierPrivate
as
    select
        sp.SupplierID,
        sp.PrimaryContactPersonID,
        sp.AlternateContactPersonID,
        sp.SupplierReference,
        sp.PhoneNumber,
        sp.FaxNumber,
        sp.WebsiteURL,
        sp.BankAccountName,
        sp.BankAccountBranch,
        sp.BankAccountCode,
        sp.BankAccountNumber,
        sp.BankInternationalCode,
        sp.InternalComments,
        sp.DeliveryAddressLine1,
        sp.DeliveryAddressLine2,
        sp.DeliveryPostalCode,
        sp.DeliveryLocation.Lat as Latitud,
        sp.DeliveryLocation.Long as Longitud,
        sp.PostalAddressLine1,
        sp.PostalAddressLine2,
        sp.PostalCityID,
        sp.PostalPostalCode
    from Purchasing.SupplierPrivate sp;
go
