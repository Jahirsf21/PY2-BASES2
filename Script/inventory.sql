use WideWorldImporters;
go
if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;
go

-- ======================================================================================
-- INVENTARIO (PRODUCTOS)
-- ======================================================================================

/*
    Obtiene los productos (stock items) paginados, ordenados alfabéticamente por nombre.
    Si un producto pertenece a varios grupos, se concatenan sus nombres en una sola columna.
    Permite filtrar opcionalmente por nombre de producto y una lista JSON de grupos ([1, 3, 5]).
    Si la lista es null o está vacía, incluye todos los grupos; ignora los IDs repetidos.
    Combina los filtros con AND y exige que el producto pertenezca a todos los grupos seleccionados.
    Incluye el total de registros (TotalCount) para calcular la paginación en el cliente.
    Devuelve: StockItemID, NombreProducto, NombreGrupoProducto, CantidadTotalEnInventarios
*/
create or alter procedure Warehouse.GetStockItems
    @StockItemName nvarchar(100) = null,
    @StockGroupIDsJson nvarchar(max) = null,
    @PageNumber int = 1,
    @PageSize int = 10,
    @TotalCount int = 0 output
as
    begin
        set nocount on;
        declare @SelectedStockGroups table (StockGroupID int primary key);
        if @StockGroupIDsJson is not null
            begin
                if isjson(@StockGroupIDsJson, array) <> 1
                    throw 50003, 'StockGroupIDsJson debe ser un arreglo JSON de IDs de categorías.', 1;
                if exists (
                    select 1
                    from openjson(@StockGroupIDsJson)
                    where [type] <> 2 or try_convert(int, [value]) is null or try_convert(int, [value]) < 1
                )
                    throw 50004, 'Los IDs de categorías deben ser números enteros positivos.', 1;
                insert into @SelectedStockGroups (StockGroupID)
                select distinct convert(int, [value])
                from openjson(@StockGroupIDsJson);
                if exists (
                    select 1
                    from @SelectedStockGroups selected
                    where not exists (select 1 from dbo.StockGroups sg where sg.StockGroupID = selected.StockGroupID)
                )
                    throw 50005, 'Una o más categorías indicadas no existen en la base de datos.', 1;
            end
        select @TotalCount = count(*) from dbo.StockItems s
        where
            s.StockItemName like '%' + isnull(@StockItemName, '') + '%'
            and exists (select 1 from dbo.StockItemHoldings sih where sih.StockItemID = s.StockItemID)
            and exists (
                select 1
                from dbo.StockItemStockGroups sig
                inner join dbo.StockGroups sg on sig.StockGroupID = sg.StockGroupID
                where sig.StockItemID = s.StockItemID
            )
            and not exists (
                select 1
                from @SelectedStockGroups selected
                where not exists (
                    select 1
                    from dbo.StockItemStockGroups sig
                    where sig.StockItemID = s.StockItemID
                        and sig.StockGroupID = selected.StockGroupID
                )
            )
        select
            s.StockItemID,
            s.StockItemName as NombreProducto,
            string_agg(sg.StockGroupName, ', ') as NombreGrupoProducto,
            sih.QuantityOnHand as CantidadTotalEnInventarios
        from dbo.StockItems s
        inner join dbo.StockItemHoldings sih on s.StockItemID = sih.StockItemID
        inner join dbo.StockItemStockGroups sig on s.StockItemID = sig.StockItemID
        inner join dbo.StockGroups sg on sig.StockGroupID = sg.StockGroupID
        where
            s.StockItemName like '%' + isnull(@StockItemName, '') + '%'
            and not exists (
                select 1
                from @SelectedStockGroups selected
                where not exists (
                    select 1
                    from dbo.StockItemStockGroups sig2
                    where sig2.StockItemID = s.StockItemID
                        and sig2.StockGroupID = selected.StockGroupID
                )
            )
        group by s.StockItemID, s.StockItemName, sih.QuantityOnHand
        order by s.StockItemName, s.StockItemID
        offset(@PageNumber - 1) * @PageSize rows
        fetch next @PageSize rows only
    end
go

/*
    Obtiene todos los grupos de productos ordenados por su identificador.
    Devuelve: StockGroupID, NombreGrupoProducto
*/
create or alter procedure Warehouse.GetStockGroups
as
    begin
        set nocount on
        select
            StockGroupID,
            StockGroupName as NombreGrupoProducto
        from dbo.StockGroups
        order by StockGroupID
    end
go

/*
    Obtiene el detalle general de un producto: proveedor, color, empaques, marca, talla, precios, peso, palabras clave,
    cantidad disponible y ubicación en bodega.
    Devuelve: stockItemID, nombreProducto, nombreProveedor, color, unidadEmpaquetamiento, empaquetamiento, cantidadEmpaquetamiento,
    marca, talla, impuesto, precioUnitario, precioVenta, peso, palabrasClave, cantidadDisponible, ubicacion
*/
create or alter procedure Warehouse.GetStockItemDetail
    @StockItemID int
as
    begin
        set nocount on
        select
            si.StockItemID,
            si.StockItemName as NombreProducto,
            sp.SupplierName as NombreProveedor,
            co.ColorName as Color,
            pu.PackageTypeName as UnidadEmpaquetamiento,
            po.PackageTypeName as Empaquetamiento,
            si.QuantityPerOuter as CantidadEmpaquetamiento,
            si.Brand as Marca,
            si.Size as Talla,
            si.TaxRate as Impuesto,
            si.UnitPrice as PrecioUnitario,
            si.RecommendedRetailPrice as PrecioVenta,
            si.TypicalWeightPerUnit as Peso,
            si.SearchDetails as PalabrasClave,
            sih.QuantityOnHand as CantidadDisponible,
            sih.BinLocation as Ubicacion
        from dbo.StockItems si
        inner join dbo.Suppliers sp on si.SupplierID = sp.SupplierID
        left join dbo.Colors co on si.ColorID = co.ColorID
        inner join dbo.PackageTypes pu on si.UnitPackageID = pu.PackageTypeID
        inner join dbo.PackageTypes po on si.OuterPackageID = po.PackageTypeID
        inner join dbo.StockItemHoldings sih on si.StockItemID = sih.StockItemID
        where si.StockItemID = @StockItemID
    end
go

/*
    Obtiene todos los grupos asociados a un producto mediante StockItemStockGroups.
    Devuelve: StockGroupID, NombreGrupoProducto.
*/
create or alter procedure Warehouse.GetStockItemStockGroups
    @StockItemID int
as
    begin
        set nocount on
        select
            sg.StockGroupID,
            sg.StockGroupName as NombreGrupoProducto
        from dbo.StockItemStockGroups sig
        inner join dbo.StockGroups sg on sg.StockGroupID = sig.StockGroupID
        where sig.StockItemID = @StockItemID
    end
go

/* Obtiene los valores editables del producto */
create or alter procedure Warehouse.GetStockItemForEdit
    @StockItemID int
as
    begin
        set nocount on
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
            sih.LastCostPrice,
            sih.ReorderLevel,
            sih.TargetStockLevel,
            sih.QuantityOnHand,
            sih.BinLocation
        from dbo.StockItems si
        inner join dbo.Suppliers sp on sp.SupplierID = si.SupplierID
        left join dbo.Colors co on co.ColorID = si.ColorID
        inner join dbo.PackageTypes pu on pu.PackageTypeID = si.UnitPackageID
        inner join dbo.PackageTypes po on po.PackageTypeID = si.OuterPackageID
        inner join dbo.StockItemHoldings sih on sih.StockItemID = si.StockItemID
        where si.StockItemID = @StockItemID
    end
go

/*
    Obtiene los colores disponibles para asignar a un producto.
    Devuelve: ColorID, ColorName.
*/
create or alter procedure Warehouse.GetColors
as
    begin
        set nocount on
        select
            ColorID,
            ColorName
        from dbo.Colors
    end
go

/*
    Obtiene los tipos de empaque disponibles para asignar a un producto.
    Devuelve: PackageTypeID, PackageTypeName.
*/
create or alter procedure Warehouse.GetPackageTypes
as
    begin
        set nocount on
        select
            PackageTypeID,
            PackageTypeName
        from dbo.PackageTypes
    end
go

/*
   Inserta un nuevo producto en las tablas StockItems, StockItemHoldings y
   StockItemStockGroups. Recibe datos generales, existencias iniciales y grupos del
   producto; devuelve el StockItemID generado a través de @NewStockItemID.
*/
create or alter procedure Warehouse.InsertStockItem
    @StockItemName nvarchar(100),
    @SupplierID int,
    @LastEditedBy int,
    @LeadTimeDays int = 1,
    @IsChillerStock bit = 0,
    @LastCostPrice decimal(18,2) = 0,
    @ReorderLevel int = 0,
    @TargetStockLevel int = 0,
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
    @QuantityOnHand int = 0,
    @BinLocation nvarchar(20) = null,
    @NewStockItemID int output
as
    begin
        set nocount on
        begin try
            begin transaction
                declare @InsertedIDs table (StockItemID int)
                insert into dbo.StockItems (
                    StockItemName, SupplierID, ColorID, UnitPackageID, OuterPackageID,
                    Brand, Size, LeadTimeDays, QuantityPerOuter, IsChillerStock, Barcode,
                    TaxRate, UnitPrice, RecommendedRetailPrice, TypicalWeightPerUnit, LastEditedBy
                )
                output inserted.StockItemID into @InsertedIDs
                values (
                    @StockItemName, @SupplierID, @ColorID, @UnitPackageID, @OuterPackageID,
                    @Brand, @Size, @LeadTimeDays, @QuantityPerOuter, @IsChillerStock, @Barcode,
                    @TaxRate, @UnitPrice, @RecommendedRetailPrice, coalesce(@TypicalWeightPerUnit,0), @LastEditedBy
                )
                select @NewStockItemID = StockItemID from @InsertedIDs
                insert into dbo.StockItemHoldings
                    (StockItemID, QuantityOnHand, BinLocation, LastStocktakeQuantity,
                     LastCostPrice, ReorderLevel, TargetStockLevel, LastEditedBy)
                values (@NewStockItemID, @QuantityOnHand, coalesce(@BinLocation,N''), 0,
                        @LastCostPrice, @ReorderLevel, @TargetStockLevel, @LastEditedBy)
                insert into dbo.StockItemStockGroups (StockItemID, StockGroupID, LastEditedBy)
                select @NewStockItemID, g.[value], @LastEditedBy
                from openjson(@StockGroupIDsJson) g
            commit transaction
            print 'Producto insertado correctamente. Nuevo StockItemID = ' + cast(@NewStockItemID as varchar(20)) + ' (' + @StockItemName + ')';
        end try
        begin catch
            if @@trancount > 0
                rollback transaction;
            ;throw;
        end catch
    end
go

/*
   Actualiza un producto existente en StockItems, StockItemHoldings y
   StockItemStockGroups. Si el producto no existe, lanza error 53000. Los grupos del
   producto se reemplazan por los recibidos en @StockGroupIDsJson.

*/
create or alter procedure Warehouse.UpdateStockItem
    @StockItemID int,
    @StockItemName nvarchar(100),
    @SupplierID int,
    @LastEditedBy int,
    @LeadTimeDays int = 1,
    @IsChillerStock bit = 0,
    @LastCostPrice decimal(18,2) = 0,
    @ReorderLevel int = 0,
    @TargetStockLevel int = 0,
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
    @QuantityOnHand int,
    @BinLocation nvarchar(20) = null
as
    begin
        set nocount on
        begin try
            begin transaction
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
                    TypicalWeightPerUnit = coalesce(@TypicalWeightPerUnit,0)
                where StockItemID = @StockItemID
                if @@rowcount = 0
                    throw 53000, 'El producto indicado no existe.', 1
                update dbo.StockItemHoldings
                set QuantityOnHand = @QuantityOnHand,
                    BinLocation = coalesce(@BinLocation,N''),
                    LastCostPrice = @LastCostPrice,
                    ReorderLevel = @ReorderLevel,
                    TargetStockLevel = @TargetStockLevel,
                    LastEditedBy = @LastEditedBy
                where StockItemID = @StockItemID
                if @@rowcount = 0
                    insert into dbo.StockItemHoldings
                        (StockItemID, QuantityOnHand, BinLocation, LastStocktakeQuantity,
                         LastCostPrice, ReorderLevel, TargetStockLevel, LastEditedBy)
                    values (@StockItemID, @QuantityOnHand, coalesce(@BinLocation,N''), 0,
                            @LastCostPrice, @ReorderLevel, @TargetStockLevel, @LastEditedBy)
                delete from dbo.StockItemStockGroups
                where StockItemID = @StockItemID

                insert into dbo.StockItemStockGroups (StockItemID, StockGroupID, LastEditedBy)
                select @StockItemID, g.[value], @LastEditedBy
                from openjson(@StockGroupIDsJson) g
            commit transaction
            print 'Producto actualizado correctamente. StockItemID = ' + cast(@StockItemID as varchar(20)) + ' (' + @StockItemName + ')';
        end try
        begin catch
            if @@trancount > 0
                rollback transaction;
            ;throw;
        end catch
    end
go

/*
   Elimina un producto por su StockItemID, borrando primero las tablas dependientes
   (StockItemStockGroups y StockItemHoldings) y luego StockItems. Si no existe, lanza
   error 53001; si hay violación de integridad referencial (error 547), lanza error
   53002 con un mensaje más claro.
*/
create or alter procedure Warehouse.DeleteStockItem
    @StockItemID int
as
    begin
        set nocount on
        begin try
            begin transaction
                delete from dbo.StockItemStockGroups
                where StockItemID = @StockItemID

                delete from dbo.StockItemHoldings
                where StockItemID = @StockItemID

                delete from dbo.StockItems
                where StockItemID = @StockItemID

                if @@rowcount = 0
                    throw 53001, 'El producto indicado no existe.', 1
            commit transaction
            print 'Producto eliminado correctamente. StockItemID = ' + cast(@StockItemID as varchar(20));
        end try
        begin catch
            if @@trancount > 0
                rollback transaction
            if error_number() = 547
                throw 53002, 'No se puede eliminar el producto porque tiene ventas u órdenes de compra asociadas.', 1
            else
                throw
        end catch
    end
go
