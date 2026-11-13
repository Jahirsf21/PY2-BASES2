use WideWorldImporters;
go
if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;
go
if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') not in (N'san-jose', N'limon')
    throw 57001, 'El nodo indicado no corresponde a una sucursal.', 1;
go

-- ======================================================================================
-- EXISTENCIAS LOCALES (SUCURSALES)
-- ======================================================================================

/*
    Obtiene las existencias del producto en la sucursal; sin fila, la cantidad es 0 y los demás valores null.
    Devuelve: StockItemID, StockItemName, QuantityOnHand, BinLocation, LastCostPrice, ReorderLevel, TargetStockLevel, Version
*/
create or alter procedure Warehouse.GetStockItemHoldingsForAdjustment
    @StockItemID int,
    @UserID int
as
    begin
        set nocount on;
        exec dbo.ValidateUserAccess @UserID = @UserID, @RequiredRole = N'Administrador';

        select
            si.StockItemID,
            si.StockItemName,
            coalesce(sih.QuantityOnHand, 0) as QuantityOnHand,
            sih.BinLocation,
            sih.LastCostPrice,
            sih.ReorderLevel,
            sih.TargetStockLevel,
            convert(varchar(18), convert(binary(8), sih.Version), 1) as Version
        from dbo.StockItems si
        left join dbo.StockItemHoldings sih on sih.StockItemID = si.StockItemID
        where si.StockItemID = @StockItemID;
    end
go

/*
    Guarda las existencias del producto en la sucursal: crea la fila si @ExpectedVersion es null
    o la actualiza si coincide con su versión. Si el producto no existe, lanza error 53000;
    si otro usuario cambió las existencias, 53004. Devuelve la nueva versión en @NewVersion.
*/
create or alter procedure Warehouse.AdjustStockItemHoldings
    @StockItemID int,
    @QuantityOnHand int,
    @BinLocation nvarchar(20) = null,
    @LastCostPrice decimal(18, 2),
    @ReorderLevel int,
    @TargetStockLevel int,
    @LastEditedBy int,
    @ExpectedVersion binary(8) = null,
    @NewVersion varchar(18) output,
    @UserID int
as
    begin
        set nocount on;
        exec dbo.ValidateUserAccess @UserID = @UserID, @RequiredRole = N'Administrador';

        begin try
            begin transaction
                if not exists (select 1 from dbo.StockItems where StockItemID = @StockItemID)
                    throw 53000, 'El producto indicado no existe en esta sucursal.', 1;

                if @ExpectedVersion is null
                    begin
                        if exists (
                            select 1
                            from dbo.StockItemHoldings with (updlock, holdlock)
                            where StockItemID = @StockItemID
                        )
                            throw 53004, 'Las existencias fueron modificadas por otro usuario. Recargue los datos antes de guardar.', 1;

                        insert into dbo.StockItemHoldings
                            (StockItemID, QuantityOnHand, BinLocation, LastStocktakeQuantity,
                             LastCostPrice, ReorderLevel, TargetStockLevel, LastEditedBy)
                        values (@StockItemID, @QuantityOnHand, coalesce(@BinLocation, N''), 0,
                                @LastCostPrice, @ReorderLevel, @TargetStockLevel, @LastEditedBy);
                    end
                else
                    begin
                        update dbo.StockItemHoldings
                        set QuantityOnHand = @QuantityOnHand,
                            BinLocation = coalesce(@BinLocation, N''),
                            LastCostPrice = @LastCostPrice,
                            ReorderLevel = @ReorderLevel,
                            TargetStockLevel = @TargetStockLevel,
                            LastEditedBy = @LastEditedBy
                        where StockItemID = @StockItemID
                            and Version = @ExpectedVersion;

                        if @@rowcount = 0
                            throw 53004, 'Las existencias fueron modificadas por otro usuario. Recargue los datos antes de guardar.', 1;
                    end

                select @NewVersion = convert(varchar(18), convert(binary(8), sih.Version), 1)
                from dbo.StockItemHoldings sih
                where sih.StockItemID = @StockItemID;
            commit transaction
        end try
        begin catch
            if @@trancount > 0
                rollback transaction;
            if error_number() in (2601, 2627)
                throw 53004, 'Las existencias fueron modificadas por otro usuario. Recargue los datos antes de guardar.', 1;
            ;throw;
        end catch
    end
go
