use WideWorldImporters;
go
if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;
go
if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') not in (N'san-jose', N'limon')
    throw 57001, 'El nodo indicado no corresponde a una sucursal.', 1;
go

-- ======================================================================================
-- ELIMINACIÓN DE PRODUCTOS (SUCURSALES)
-- ======================================================================================

/*
    Guarda los productos bloqueados por eliminación con la copia de sus existencias en la sucursal.
*/
if object_id(N'Warehouse.StockItemDeletionLocks', N'U') is null
    create table Warehouse.StockItemDeletionLocks (
        StockItemID int not null
            constraint PK_Warehouse_StockItemDeletionLocks primary key,
        Confirmed bit not null
            constraint DF_Warehouse_StockItemDeletionLocks_Confirmed default (0),
        LockedWhen datetime2(7) not null
            constraint DF_Warehouse_StockItemDeletionLocks_LockedWhen default (sysutcdatetime()),
        QuantityOnHand int null,
        BinLocation nvarchar(20) null,
        LastStocktakeQuantity int null,
        LastCostPrice decimal(18, 2) null,
        ReorderLevel int null,
        TargetStockLevel int null,
        HoldingsLastEditedBy int null,
        HoldingsLastEditedWhen datetime2(7) null
    );
go

/*
    Valida el usuario y la sucursal de origen enviados por la API para coordinar una eliminación en la sucursal.
    Si el usuario es inválido, lanza error 56003; si el nodo no está permitido, lanza error 56001.
*/
create or alter procedure dbo.ValidateDeletionAccess
    @UserID int,
    @OriginNode nvarchar(20)
as
begin
    set nocount on;

    if @UserID is null or @UserID < 1
        throw 56003, N'El usuario no existe o está inactivo.', 1;

    if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') not in (N'san-jose', N'limon')
        or @OriginNode is null
        or @OriginNode not in (N'san-jose', N'limon')
        throw 56001, N'El rol no tiene acceso a la sucursal seleccionada.', 1;
end
go

/*
    Bloquea el producto en la sucursal: guarda una copia de sus existencias y las borra.
    Si el producto tiene facturas, órdenes o movimientos en la sucursal, lanza error 53002.
*/
create or alter procedure Warehouse.LockStockItemForDeletion
    @StockItemID int,
    @UserID int,
    @OriginNode nvarchar(20)
as
    begin
        set nocount on;
        exec dbo.ValidateDeletionAccess @UserID = @UserID, @OriginNode = @OriginNode;

        set transaction isolation level serializable;
        begin try
            begin transaction
                if not exists (
                    select 1
                    from dbo.StockItemDeletionLocks
                    where StockItemID = @StockItemID
                )
                    insert into dbo.StockItemDeletionLocks (
                        StockItemID, QuantityOnHand, BinLocation, LastStocktakeQuantity, LastCostPrice,
                        ReorderLevel, TargetStockLevel, HoldingsLastEditedBy, HoldingsLastEditedWhen
                    )
                    select
                        p.StockItemID, sih.QuantityOnHand, sih.BinLocation, sih.LastStocktakeQuantity, sih.LastCostPrice,
                        sih.ReorderLevel, sih.TargetStockLevel, sih.LastEditedBy, sih.LastEditedWhen
                    from (select @StockItemID as StockItemID) p
                    left join dbo.StockItemHoldings sih on sih.StockItemID = p.StockItemID;

                if exists (select 1 from dbo.InvoiceLines where StockItemID = @StockItemID)
                    or exists (select 1 from dbo.OrderLines where StockItemID = @StockItemID)
                    or exists (select 1 from dbo.PurchaseOrderLines where StockItemID = @StockItemID)
                    or exists (select 1 from dbo.StockItemTransactions where StockItemID = @StockItemID)
                    throw 53002, 'No se puede eliminar el producto porque tiene ventas u órdenes de compra asociadas.', 1;

                delete from dbo.StockItemHoldings
                where StockItemID = @StockItemID;
            commit transaction
        end try
        begin catch
            if @@trancount > 0
                rollback transaction;
            ;throw;
        end catch
    end
go

/*
    Desbloquea el producto en la sucursal y restaura las existencias guardadas al bloquearlo.
    Conserva el bloqueo si la eliminación ya fue confirmada.
*/
create or alter procedure Warehouse.UnlockStockItemForDeletion
    @StockItemID int,
    @UserID int,
    @OriginNode nvarchar(20)
as
    begin
        set nocount on;
        exec dbo.ValidateDeletionAccess @UserID = @UserID, @OriginNode = @OriginNode;

        set transaction isolation level serializable;
        begin try
            begin transaction
                if exists (
                    select 1
                    from dbo.StockItemDeletionLocks
                    where StockItemID = @StockItemID
                        and Confirmed = 0
                )
                    begin
                        insert into dbo.StockItemHoldings (
                            StockItemID, QuantityOnHand, BinLocation, LastStocktakeQuantity, LastCostPrice,
                            ReorderLevel, TargetStockLevel, LastEditedBy, LastEditedWhen
                        )
                        select
                            l.StockItemID, l.QuantityOnHand, l.BinLocation, l.LastStocktakeQuantity, l.LastCostPrice,
                            l.ReorderLevel, l.TargetStockLevel, l.HoldingsLastEditedBy, l.HoldingsLastEditedWhen
                        from dbo.StockItemDeletionLocks l
                        where l.StockItemID = @StockItemID
                            and l.QuantityOnHand is not null
                            and exists (select 1 from dbo.StockItems si where si.StockItemID = l.StockItemID)
                            and not exists (select 1 from dbo.StockItemHoldings sih where sih.StockItemID = l.StockItemID);

                        delete from dbo.StockItemDeletionLocks
                        where StockItemID = @StockItemID;
                    end
            commit transaction
        end try
        begin catch
            if @@trancount > 0
                rollback transaction;
            ;throw;
        end catch
    end
go

/*
    Marca como confirmada la eliminación del producto bloqueado en la sucursal.
*/
create or alter procedure Warehouse.ConfirmStockItemDeletion
    @StockItemID int,
    @UserID int,
    @OriginNode nvarchar(20)
as
    begin
        set nocount on;
        exec dbo.ValidateDeletionAccess @UserID = @UserID, @OriginNode = @OriginNode;

        update dbo.StockItemDeletionLocks
        set Confirmed = 1
        where StockItemID = @StockItemID;
    end
go
