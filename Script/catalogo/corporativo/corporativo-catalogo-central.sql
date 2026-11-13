use WideWorldImporters;
go
if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;
go
if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') <> N'corporativo'
    throw 57001, 'El nodo indicado no corresponde a Corporativo.', 1;
go

-- ======================================================================================
-- CATÁLOGO CENTRAL (CORPORATIVO)
-- ======================================================================================

/*
    Valida el usuario y la sucursal de origen enviados por la API para operar el catálogo en Corporativo.
    Si el usuario es inválido, lanza error 56003; si el nodo no está permitido, lanza error 56001.
*/
create or alter procedure dbo.ValidateCatalogAccess
    @UserID int,
    @OriginNode nvarchar(20)
as
begin
    set nocount on;

    if @UserID is null or @UserID < 1
        throw 56003, N'El usuario no existe o está inactivo.', 1;

    if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') <> N'corporativo'
        or @OriginNode is null
        or @OriginNode not in (N'san-jose', N'limon')
        throw 56001, N'El rol no tiene acceso a la sucursal seleccionada.', 1;
end
go

/*
    Obtiene los valores editables del producto, sus grupos y su versión en una misma lectura.
    Si el producto no tiene versión, lanza error 53005.
    Devuelve: valores editables con Version, y StockGroupID, NombreGrupoProducto
*/
create or alter procedure Warehouse.GetCatalogStockItemForEdit
    @StockItemID int,
    @UserID int,
    @OriginNode nvarchar(20)
as
    begin
        set nocount on;
        exec dbo.ValidateCatalogAccess @UserID = @UserID, @OriginNode = @OriginNode;

        begin try
            begin transaction
                declare @Version binary(8);

                select @Version = v.Version
                from dbo.StockItemVersions v with (repeatableread)
                where v.StockItemID = @StockItemID;

                if @Version is null and exists (select 1 from dbo.StockItems where StockItemID = @StockItemID)
                    throw 53005, 'El producto no tiene versión de catálogo en Corporativo.', 1;

                select
                    si.StockItemID,
                    si.StockItemName,
                    si.SupplierID,
                    sp.SupplierName,
                    si.LastEditedBy,
                    si.LeadTimeDays,
                    si.IsChillerStock,
                    si.ColorID,
                    co.ColorName,
                    si.UnitPackageID,
                    pu.PackageTypeName as UnitPackageName,
                    si.OuterPackageID,
                    po.PackageTypeName as OuterPackageName,
                    si.Brand,
                    si.Size,
                    si.QuantityPerOuter,
                    si.Barcode,
                    si.TaxRate,
                    si.UnitPrice,
                    si.RecommendedRetailPrice,
                    si.TypicalWeightPerUnit,
                    convert(varchar(18), @Version, 1) as Version
                from dbo.StockItems si
                inner join dbo.Suppliers sp on sp.SupplierID = si.SupplierID
                left join dbo.Colors co on co.ColorID = si.ColorID
                inner join dbo.PackageTypes pu on pu.PackageTypeID = si.UnitPackageID
                inner join dbo.PackageTypes po on po.PackageTypeID = si.OuterPackageID
                where si.StockItemID = @StockItemID;

                select
                    sg.StockGroupID,
                    sg.StockGroupName as NombreGrupoProducto
                from dbo.StockItemStockGroups sig
                inner join dbo.StockGroups sg on sg.StockGroupID = sig.StockGroupID
                where sig.StockItemID = @StockItemID
                order by sg.StockGroupID;
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
    Inserta un producto del catálogo en StockItems, StockItemVersions y StockItemStockGroups.
    Devuelve el StockItemID generado en @NewStockItemID y su versión en @NewVersion.
*/
create or alter procedure Warehouse.InsertCatalogStockItem
    @StockItemName nvarchar(100),
    @SupplierID int,
    @LastEditedBy int,
    @LeadTimeDays int = 1,
    @IsChillerStock bit = 0,
    @ColorID int = null,
    @UnitPackageID int,
    @OuterPackageID int,
    @Brand nvarchar(50) = null,
    @Size nvarchar(20) = null,
    @QuantityPerOuter int = 1,
    @Barcode nvarchar(50) = null,
    @TaxRate decimal(18, 3),
    @UnitPrice decimal(18, 2),
    @RecommendedRetailPrice decimal(18, 2) = null,
    @TypicalWeightPerUnit decimal(18, 3) = null,
    @StockGroupIDsJson nvarchar(max),
    @NewStockItemID int output,
    @NewVersion varchar(18) output,
    @UserID int,
    @OriginNode nvarchar(20)
as
    begin
        set nocount on;
        exec dbo.ValidateCatalogAccess @UserID = @UserID, @OriginNode = @OriginNode;

        begin try
            begin transaction
                declare @InsertedIDs table (StockItemID int);

                insert into dbo.StockItems (
                    StockItemName, SupplierID, ColorID, UnitPackageID, OuterPackageID,
                    Brand, Size, LeadTimeDays, QuantityPerOuter, IsChillerStock, Barcode,
                    TaxRate, UnitPrice, RecommendedRetailPrice, TypicalWeightPerUnit, LastEditedBy
                )
                output inserted.StockItemID into @InsertedIDs
                values (
                    @StockItemName, @SupplierID, @ColorID, @UnitPackageID, @OuterPackageID,
                    @Brand, @Size, @LeadTimeDays, @QuantityPerOuter, @IsChillerStock, @Barcode,
                    @TaxRate, @UnitPrice, @RecommendedRetailPrice, coalesce(@TypicalWeightPerUnit, 0), @LastEditedBy
                );
                select @NewStockItemID = StockItemID from @InsertedIDs;

                insert into dbo.StockItemVersions (StockItemID)
                values (@NewStockItemID);

                insert into dbo.StockItemStockGroups (StockItemID, StockGroupID, LastEditedBy)
                select @NewStockItemID, g.[value], @LastEditedBy
                from openjson(@StockGroupIDsJson) g;

                select @NewVersion = convert(varchar(18), v.Version, 1)
                from dbo.StockItemVersions v
                where v.StockItemID = @NewStockItemID;
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
    Actualiza un producto del catálogo y reemplaza sus grupos si @ExpectedVersion es la versión actual.
    Si el producto no existe, lanza error 53000; si no tiene versión, 53005; si la versión cambió, 53003.
    Devuelve la nueva versión en @NewVersion.
*/
create or alter procedure Warehouse.UpdateCatalogStockItem
    @StockItemID int,
    @StockItemName nvarchar(100),
    @SupplierID int,
    @LastEditedBy int,
    @LeadTimeDays int = 1,
    @IsChillerStock bit = 0,
    @ColorID int = null,
    @UnitPackageID int,
    @OuterPackageID int,
    @Brand nvarchar(50) = null,
    @Size nvarchar(20) = null,
    @QuantityPerOuter int = 1,
    @Barcode nvarchar(50) = null,
    @TaxRate decimal(18, 3),
    @UnitPrice decimal(18, 2),
    @RecommendedRetailPrice decimal(18, 2) = null,
    @TypicalWeightPerUnit decimal(18, 3) = null,
    @StockGroupIDsJson nvarchar(max),
    @ExpectedVersion binary(8),
    @NewVersion varchar(18) output,
    @UserID int,
    @OriginNode nvarchar(20)
as
    begin
        set nocount on;
        exec dbo.ValidateCatalogAccess @UserID = @UserID, @OriginNode = @OriginNode;

        begin try
            begin transaction
                update dbo.StockItemVersions
                set LastEditedWhen = sysutcdatetime()
                where StockItemID = @StockItemID
                    and Version = @ExpectedVersion;

                if @@rowcount = 0
                    begin
                        if not exists (select 1 from dbo.StockItems where StockItemID = @StockItemID)
                            throw 53000, 'El producto indicado no existe.', 1;
                        if not exists (select 1 from dbo.StockItemVersions where StockItemID = @StockItemID)
                            throw 53005, 'El producto no tiene versión de catálogo en Corporativo.', 1;
                        throw 53003, 'El producto fue modificado por otro usuario. Recargue los datos antes de guardar.', 1;
                    end

                update dbo.StockItems
                set
                    StockItemName = @StockItemName,
                    LeadTimeDays = @LeadTimeDays,
                    IsChillerStock = @IsChillerStock,
                    LastEditedBy = @LastEditedBy,
                    SupplierID = @SupplierID,
                    ColorID = @ColorID,
                    UnitPackageID = @UnitPackageID,
                    OuterPackageID = @OuterPackageID,
                    Brand = @Brand,
                    Size = @Size,
                    QuantityPerOuter = @QuantityPerOuter,
                    Barcode = @Barcode,
                    TaxRate = @TaxRate,
                    UnitPrice = @UnitPrice,
                    RecommendedRetailPrice = @RecommendedRetailPrice,
                    TypicalWeightPerUnit = coalesce(@TypicalWeightPerUnit, 0)
                where StockItemID = @StockItemID;

                delete from dbo.StockItemStockGroups
                where StockItemID = @StockItemID;

                insert into dbo.StockItemStockGroups (StockItemID, StockGroupID, LastEditedBy)
                select @StockItemID, g.[value], @LastEditedBy
                from openjson(@StockGroupIDsJson) g;

                select @NewVersion = convert(varchar(18), v.Version, 1)
                from dbo.StockItemVersions v
                where v.StockItemID = @StockItemID;
            commit transaction
        end try
        begin catch
            if @@trancount > 0
                rollback transaction;
            ;throw;
        end catch
    end
go
