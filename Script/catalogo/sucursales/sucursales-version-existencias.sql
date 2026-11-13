use WideWorldImporters;
go

if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;

-- ======================================================================================
-- (VERSIÓN DE LAS EXISTENCIAS LOCALES)
-- ======================================================================================

/*
    Añade la columna Version a las existencias de la sucursal.
    Requiere que Warehouse.StockItemHoldings no tenga versionado temporal ni la columna Version.
*/
set nocount on;

if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') not in (N'san-jose', N'limon')
    throw 57001, 'El nodo indicado no corresponde a una sucursal.', 1;

if exists (
    select 1
    from sys.tables t
    where t.object_id = object_id(N'Warehouse.StockItemHoldings')
        and t.temporal_type <> 0
)
    throw 57016, 'Las existencias tienen versionado temporal.', 1;

if col_length(N'Warehouse.StockItemHoldings', N'Version') is not null
    throw 57017, 'La columna de versión de existencias ya existe.', 1;

alter table Warehouse.StockItemHoldings add Version rowversion not null;
go
