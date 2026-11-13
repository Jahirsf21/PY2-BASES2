use WideWorldImporters;

if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;

-- ======================================================================================
-- (RETIRO DE DATOS SENSIBLES EN SUCURSALES)
-- ======================================================================================

/*
    Retira columnas sensibles actuales e históricas y ajusta las claves foráneas e índices locales.
    Conserva los datos generales y la temporalidad.
    Requiere que los datos originales estén completos en Corporativo.
    Requiere que las consultas de la aplicación estén validadas.
*/
set nocount on;

if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') not in (N'san-jose', N'limon')
    throw 57001, 'El nodo indicado no corresponde a una sucursal.', 1;

if (
    select count(*)
    from sys.tables
    where temporal_type = 2
      and (
          (object_id = object_id(N'Application.People', N'U')
              and history_table_id = object_id(N'Application.People_Archive', N'U'))
          or (object_id = object_id(N'Sales.Customers', N'U')
              and history_table_id = object_id(N'Sales.Customers_Archive', N'U'))
          or (object_id = object_id(N'Purchasing.Suppliers', N'U')
              and history_table_id = object_id(N'Purchasing.Suppliers_Archive', N'U'))
      )
) <> 3
    throw 57008, 'Las tablas temporales no tienen los historiales esperados.', 1;

if col_length(N'Application.People', N'LogonName') is null
    or col_length(N'Application.People_Archive', N'LogonName') is null
    or col_length(N'Sales.Customers', N'PrimaryContactPersonID') is null
    or col_length(N'Sales.Customers_Archive', N'PrimaryContactPersonID') is null
    or col_length(N'Purchasing.Suppliers', N'PrimaryContactPersonID') is null
    or col_length(N'Purchasing.Suppliers_Archive', N'PrimaryContactPersonID') is null
    throw 57009, 'Una o más columnas sensibles requeridas no existen.', 1;

set xact_abort on;

begin try
    begin transaction;

    /*
        Retira las relaciones locales de contactos y ciudad postal.
    */
    alter table Sales.Customers
        drop constraint FK_Sales_Customers_PrimaryContactPersonID_Application_People;
    alter table Sales.Customers
        drop constraint FK_Sales_Customers_AlternateContactPersonID_Application_People;
    alter table Sales.Customers
        drop constraint FK_Sales_Customers_PostalCityID_Application_Cities;

    alter table Purchasing.Suppliers
        drop constraint FK_Purchasing_Suppliers_PrimaryContactPersonID_Application_People;
    alter table Purchasing.Suppliers
        drop constraint FK_Purchasing_Suppliers_AlternateContactPersonID_Application_People;
    alter table Purchasing.Suppliers
        drop constraint FK_Purchasing_Suppliers_PostalCityID_Application_Cities;

    /*
        Retira los índices dedicados a columnas privadas.
    */
    drop index FK_Sales_Customers_PrimaryContactPersonID on Sales.Customers;
    drop index FK_Sales_Customers_AlternateContactPersonID on Sales.Customers;
    drop index FK_Sales_Customers_PostalCityID on Sales.Customers;

    drop index FK_Purchasing_Suppliers_PrimaryContactPersonID on Purchasing.Suppliers;
    drop index FK_Purchasing_Suppliers_AlternateContactPersonID on Purchasing.Suppliers;
    drop index FK_Purchasing_Suppliers_PostalCityID on Purchasing.Suppliers;

    /*
        Reconstruye los índices mixtos conservando sus columnas generales y nombres.
    */
    create nonclustered index IX_Application_People_Perf_20160301_05
        on Application.People (IsPermittedToLogon, PersonID)
        include (FullName)
        with (drop_existing = on);

    create nonclustered index IX_Sales_Customers_Perf_20160301_06
        on Sales.Customers (IsOnCreditHold, CustomerID, BillToCustomerID)
        with (drop_existing = on);

    /*
        Retira OtherLanguages antes de CustomFields; la temporalidad propaga el cambio al historial.
    */
    alter table Application.People drop column OtherLanguages;

    /*
        Retira las columnas sensibles, conservando identificadores, datos generales y períodos.
    */
    alter table Application.People drop column
        PhoneNumber,
        FaxNumber,
        EmailAddress,
        LogonName,
        HashedPassword,
        Photo,
        UserPreferences,
        CustomFields;

    alter table Sales.Customers drop column
        PrimaryContactPersonID,
        AlternateContactPersonID,
        CreditLimit,
        PhoneNumber,
        FaxNumber,
        WebsiteURL,
        DeliveryAddressLine1,
        DeliveryAddressLine2,
        DeliveryPostalCode,
        DeliveryLocation,
        PostalAddressLine1,
        PostalAddressLine2,
        PostalCityID,
        PostalPostalCode;

    alter table Purchasing.Suppliers drop column
        PrimaryContactPersonID,
        AlternateContactPersonID,
        SupplierReference,
        PhoneNumber,
        FaxNumber,
        WebsiteURL,
        BankAccountName,
        BankAccountBranch,
        BankAccountCode,
        BankAccountNumber,
        BankInternationalCode,
        InternalComments,
        DeliveryAddressLine1,
        DeliveryAddressLine2,
        DeliveryPostalCode,
        DeliveryLocation,
        PostalAddressLine1,
        PostalAddressLine2,
        PostalCityID,
        PostalPostalCode;

    commit transaction;
end try
begin catch
    if @@trancount > 0
        rollback transaction;
    ;throw;
end catch;
