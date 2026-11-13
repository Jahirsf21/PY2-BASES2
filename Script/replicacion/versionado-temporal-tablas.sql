use WideWorldImporters;

if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;

-- ======================================================================================
-- (CATÁLOGO SIN VERSIONADO TEMPORAL PARA LA REPLICACIÓN)
-- ======================================================================================

/*
    Convierte el catálogo en tablas ordinarias en los tres nodos para la replicación.
    Conserva los datos y las tablas históricas, sin generar nuevas versiones temporales.
    Requiere que los datos del catálogo coincidan en los tres nodos.
*/
set nocount on;

if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') not in (N'san-jose', N'limon', N'corporativo')
    throw 57001, 'El nodo indicado no corresponde a corporativo ni a una sucursal.', 1;

set xact_abort on;

begin try
    begin transaction;

    /*
        Retira el versionado temporal de los productos.
    */
    alter table Warehouse.StockItems set (system_versioning = off);
    alter table Warehouse.StockItems drop period for system_time;
    alter table Warehouse.StockItems add
        constraint DF_Warehouse_StockItems_ValidFrom default (sysutcdatetime()) for ValidFrom,
        constraint DF_Warehouse_StockItems_ValidTo default (convert(datetime2(7), '9999-12-31T23:59:59.9999999')) for ValidTo;

    /*
        Retira el versionado temporal de los colores.
    */
    alter table Warehouse.Colors set (system_versioning = off);
    alter table Warehouse.Colors drop period for system_time;
    alter table Warehouse.Colors add
        constraint DF_Warehouse_Colors_ValidFrom default (sysutcdatetime()) for ValidFrom,
        constraint DF_Warehouse_Colors_ValidTo default (convert(datetime2(7), '9999-12-31T23:59:59.9999999')) for ValidTo;

    /*
        Retira el versionado temporal de los tipos de empaque.
    */
    alter table Warehouse.PackageTypes set (system_versioning = off);
    alter table Warehouse.PackageTypes drop period for system_time;
    alter table Warehouse.PackageTypes add
        constraint DF_Warehouse_PackageTypes_ValidFrom default (sysutcdatetime()) for ValidFrom,
        constraint DF_Warehouse_PackageTypes_ValidTo default (convert(datetime2(7), '9999-12-31T23:59:59.9999999')) for ValidTo;

    /*
        Retira el versionado temporal de los grupos de productos.
    */
    alter table Warehouse.StockGroups set (system_versioning = off);
    alter table Warehouse.StockGroups drop period for system_time;
    alter table Warehouse.StockGroups add
        constraint DF_Warehouse_StockGroups_ValidFrom default (sysutcdatetime()) for ValidFrom,
        constraint DF_Warehouse_StockGroups_ValidTo default (convert(datetime2(7), '9999-12-31T23:59:59.9999999')) for ValidTo;

    commit transaction;
end try
begin catch
    if @@trancount > 0
        rollback transaction;
    ;throw;
end catch;
