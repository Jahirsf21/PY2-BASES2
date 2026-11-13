use WideWorldImporters;
go

if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;

-- ======================================================================================
-- (VERSIÓN DEL CATÁLOGO CENTRAL)
-- ======================================================================================

/*
    Crea en Corporativo la tabla de versiones del catálogo, con una fila por producto.
    Requiere que la tabla no exista.
*/
set nocount on;

if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') <> N'corporativo'
    throw 57001, 'El nodo indicado no corresponde a Corporativo.', 1;

if object_id(N'Warehouse.StockItemVersions', N'U') is not null
    throw 57015, 'La tabla de versiones del catálogo ya existe.', 1;

set xact_abort on;

begin try
    begin transaction;

    /*
        Guarda la versión de cada producto.
    */
    create table Warehouse.StockItemVersions (
        StockItemID int not null
            constraint PK_Warehouse_StockItemVersions primary key
            constraint FK_Warehouse_StockItemVersions_StockItems
                references Warehouse.StockItems (StockItemID),
        Version rowversion not null,
        LastEditedWhen datetime2(7) not null
            constraint DF_Warehouse_StockItemVersions_LastEditedWhen default (sysutcdatetime())
    );

    /*
        Carga la versión inicial de los productos existentes.
    */
    insert into Warehouse.StockItemVersions (StockItemID)
    select si.StockItemID
    from Warehouse.StockItems si with (holdlock);

    commit transaction;
end try
begin catch
    if @@trancount > 0
        rollback transaction;
    throw;
end catch;
go
