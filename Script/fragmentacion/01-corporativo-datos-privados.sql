use WideWorldImporters;

if db_name() <> N'WideWorldImporters'
    throw 57000, N'Base incorrecta', 1;

-- ======================================================================================
-- FRAGMENTACIÓN VERTICAL (DATOS SENSIBLES)
-- ======================================================================================

/*
    Crea las tablas con los datos sensibles de personas, clientes y proveedores en Corporativo.
    Copia los datos actuales conservando los identificadores y las relaciones.
    Conserva las tablas originales y su historial.
    Requiere que las tablas privadas no existan.
*/
set nocount on;

if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') <> N'corporativo'
    throw 57001, N'Este script solo se ejecuta en el nodo corporativo.', 1;

if object_id(N'Application.PeoplePrivate') is not null
    or object_id(N'Sales.CustomerPrivate') is not null
    or object_id(N'Purchasing.SupplierPrivate') is not null
    throw 57003, N'Ya existe alguna de las tablas de datos sensibles. No se puede repetir la carga inicial.', 1;

set xact_abort on;

begin try
    begin transaction;

    /*
        Crea la tabla con los datos sensibles de las personas.
        Calcula OtherLanguages a partir de CustomFields, como en la tabla original.
    */
    create table Application.PeoplePrivate (
        PersonID int not null,
        PhoneNumber nvarchar(20) null,
        FaxNumber nvarchar(20) null,
        EmailAddress nvarchar(256) null,
        LogonName nvarchar(50) null,
        HashedPassword varbinary(max) null,
        Photo varbinary(max) null,
        UserPreferences nvarchar(max) null,
        CustomFields nvarchar(max) null,
        OtherLanguages as json_query(CustomFields, N'$.OtherLanguages'),
        constraint PK_Application_PeoplePrivate primary key (PersonID),
        constraint FK_Application_PeoplePrivate_PersonID foreign key (PersonID)
            references Application.People (PersonID)
    );

    /*
        Crea la tabla con los datos sensibles de los clientes.
        Relaciona los contactos con las personas y la dirección postal con su ciudad.
    */
    create table Sales.CustomerPrivate (
        CustomerID int not null,
        PrimaryContactPersonID int not null,
        AlternateContactPersonID int null,
        CreditLimit decimal(18,2) null,
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
        constraint FK_Sales_CustomerPrivate_CustomerID foreign key (CustomerID)
            references Sales.Customers (CustomerID),
        constraint FK_Sales_CustomerPrivate_PrimaryContactPersonID foreign key (PrimaryContactPersonID)
            references Application.PeoplePrivate (PersonID),
        constraint FK_Sales_CustomerPrivate_AlternateContactPersonID foreign key (AlternateContactPersonID)
            references Application.PeoplePrivate (PersonID),
        constraint FK_Sales_CustomerPrivate_PostalCityID foreign key (PostalCityID)
            references Application.Cities (CityID)
    );

    /*
        Crea la tabla con los datos sensibles de los proveedores.
        Conserva las máscaras de las columnas bancarias originales.
    */
    create table Purchasing.SupplierPrivate (
        SupplierID int not null,
        PrimaryContactPersonID int not null,
        AlternateContactPersonID int not null,
        SupplierReference nvarchar(20) null,
        PhoneNumber nvarchar(20) not null,
        FaxNumber nvarchar(20) not null,
        WebsiteURL nvarchar(256) not null,
        BankAccountName nvarchar(50) masked with (function = 'default()') null,
        BankAccountBranch nvarchar(50) masked with (function = 'default()') null,
        BankAccountCode nvarchar(20) masked with (function = 'default()') null,
        BankAccountNumber nvarchar(20) masked with (function = 'default()') null,
        BankInternationalCode nvarchar(20) masked with (function = 'default()') null,
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
        constraint FK_Purchasing_SupplierPrivate_SupplierID foreign key (SupplierID)
            references Purchasing.Suppliers (SupplierID),
        constraint FK_Purchasing_SupplierPrivate_PrimaryContactPersonID foreign key (PrimaryContactPersonID)
            references Application.PeoplePrivate (PersonID),
        constraint FK_Purchasing_SupplierPrivate_AlternateContactPersonID foreign key (AlternateContactPersonID)
            references Application.PeoplePrivate (PersonID),
        constraint FK_Purchasing_SupplierPrivate_PostalCityID foreign key (PostalCityID)
            references Application.Cities (CityID)
    );

    /*
        Copia los datos sensibles actuales conservando sus identificadores.
        Inserta primero las personas para mantener las referencias de clientes y proveedores.
    */
    insert into Application.PeoplePrivate (
        PersonID, PhoneNumber, FaxNumber, EmailAddress, LogonName,
        HashedPassword, Photo, UserPreferences, CustomFields
    )
    select PersonID, PhoneNumber, FaxNumber, EmailAddress, LogonName,
           HashedPassword, Photo, UserPreferences, CustomFields
    from Application.People;

    insert into Sales.CustomerPrivate (
        CustomerID, PrimaryContactPersonID, AlternateContactPersonID, CreditLimit,
        PhoneNumber, FaxNumber, WebsiteURL,
        DeliveryAddressLine1, DeliveryAddressLine2, DeliveryPostalCode, DeliveryLocation,
        PostalAddressLine1, PostalAddressLine2, PostalCityID, PostalPostalCode
    )
    select CustomerID, PrimaryContactPersonID, AlternateContactPersonID, CreditLimit,
           PhoneNumber, FaxNumber, WebsiteURL,
           DeliveryAddressLine1, DeliveryAddressLine2, DeliveryPostalCode, DeliveryLocation,
           PostalAddressLine1, PostalAddressLine2, PostalCityID, PostalPostalCode
    from Sales.Customers;

    insert into Purchasing.SupplierPrivate (
        SupplierID, PrimaryContactPersonID, AlternateContactPersonID, SupplierReference,
        PhoneNumber, FaxNumber, WebsiteURL,
        BankAccountName, BankAccountBranch, BankAccountCode, BankAccountNumber, BankInternationalCode,
        InternalComments, DeliveryAddressLine1, DeliveryAddressLine2, DeliveryPostalCode, DeliveryLocation,
        PostalAddressLine1, PostalAddressLine2, PostalCityID, PostalPostalCode
    )
    select SupplierID, PrimaryContactPersonID, AlternateContactPersonID, SupplierReference,
           PhoneNumber, FaxNumber, WebsiteURL,
           BankAccountName, BankAccountBranch, BankAccountCode, BankAccountNumber, BankInternationalCode,
           InternalComments, DeliveryAddressLine1, DeliveryAddressLine2, DeliveryPostalCode, DeliveryLocation,
           PostalAddressLine1, PostalAddressLine2, PostalCityID, PostalPostalCode
    from Purchasing.Suppliers;

    commit transaction;
end try
begin catch
    if @@trancount > 0
        rollback transaction;
    throw;
end catch;
