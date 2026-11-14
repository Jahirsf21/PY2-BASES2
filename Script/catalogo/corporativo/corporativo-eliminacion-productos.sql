use WideWorldImporters;
go
if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;
go
if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') <> N'corporativo'
    throw 57001, 'El nodo indicado no corresponde a Corporativo.', 1;
go

-- ======================================================================================
-- ELIMINACIÓN DE PRODUCTOS (CORPORATIVO)
-- ======================================================================================

/*
    Comprueba que el producto del catálogo puede eliminarse.
    Si no existe, lanza error 53001; si tiene facturas, órdenes o movimientos, lanza error 53002.
*/
create or alter procedure Warehouse.CheckCatalogStockItemDeletion
    @StockItemID int,
    @UserID int,
    @OriginNode nvarchar(20)
as
    begin
        set nocount on;
        exec dbo.ValidateCatalogAccess @UserID = @UserID, @OriginNode = @OriginNode;

        if not exists (select 1 from dbo.StockItems where StockItemID = @StockItemID)
            throw 53001, 'El producto indicado no existe.', 1;

        if exists (select 1 from dbo.InvoiceLines where StockItemID = @StockItemID)
            or exists (select 1 from dbo.OrderLines where StockItemID = @StockItemID)
            or exists (select 1 from dbo.PurchaseOrderLines where StockItemID = @StockItemID)
            or exists (select 1 from dbo.StockItemTransactions where StockItemID = @StockItemID)
            throw 53002, 'No se puede eliminar el producto porque tiene ventas u órdenes de compra asociadas.', 1;
    end
go

/*
    Elimina un producto del catálogo con su versión, sus grupos y sus existencias.
    Si no existe, lanza error 53001; si tiene facturas, órdenes o movimientos, lanza error 53002.
*/
create or alter procedure Warehouse.DeleteCatalogStockItem
    @StockItemID int,
    @UserID int,
    @OriginNode nvarchar(20)
as
    begin
        set nocount on;
        exec dbo.ValidateCatalogAccess @UserID = @UserID, @OriginNode = @OriginNode;

        begin try
            begin transaction
                delete from dbo.StockItemVersions
                where StockItemID = @StockItemID;

                exec Warehouse.CheckCatalogStockItemDeletion
                    @StockItemID = @StockItemID, @UserID = @UserID, @OriginNode = @OriginNode;

                delete from dbo.StockItemStockGroups
                where StockItemID = @StockItemID;

                delete from dbo.StockItemHoldings
                where StockItemID = @StockItemID;

                delete from dbo.StockItems
                where StockItemID = @StockItemID;
            commit transaction
        end try
        begin catch
            if @@trancount > 0
                rollback transaction;
            if error_number() = 547
                throw 53002, 'No se puede eliminar el producto porque tiene ventas u órdenes de compra asociadas.', 1;
            ;throw;
        end catch
    end
go
