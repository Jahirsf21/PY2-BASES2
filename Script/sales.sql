use WideWorldImporters;
go
if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;
go

-- ======================================================================================
-- VENTAS (FACTURAS)
-- ======================================================================================

/*
    Obtiene las facturas paginadas, ordenadas por nombre del cliente y luego por identificador.
    Valida el orden de los rangos de fechas y montos y que los montos no sean negativos.
    Incluye el total de registros (TotalCount) para calcular la paginación en el cliente.
    Devuelve: NumeroFactura, FechaFactura, NombreCliente, NombreMetodoEntrega, MontoFacturado
*/
create or alter procedure Sales.GetInvoices
    @InvoiceID int = null,
    @InvoiceDateFrom date = null,
    @InvoiceDateTo date = null,
    @CustomerName nvarchar(100) = null,
    @DeliveryMethodID int = null,
    @MinInvoiceAmount decimal(18, 2) = null,
    @MaxInvoiceAmount decimal(18, 2) = null,
    @PageNumber int = 1,
    @PageSize int = 10,
    @TotalCount int = 0 output
as
    begin
        set nocount on;
        if @InvoiceDateFrom is not null and @InvoiceDateTo is not null and @InvoiceDateFrom > @InvoiceDateTo
            throw 54004, 'La fecha inicial no puede ser mayor que la fecha final.', 1;
        if @MinInvoiceAmount < 0 or @MaxInvoiceAmount < 0
            throw 54005, 'Los montos no pueden ser negativos.', 1;
        if @MinInvoiceAmount is not null and @MaxInvoiceAmount is not null and @MinInvoiceAmount > @MaxInvoiceAmount
            throw 54006, 'El monto mínimo no puede ser mayor que el monto máximo.', 1;
        select @TotalCount = count(*)
        from (
            select iv.InvoiceID
            from dbo.Invoices iv
            inner join dbo.Customers cs on iv.CustomerID = cs.CustomerID
            inner join dbo.DeliveryMethods dv on iv.DeliveryMethodID = dv.DeliveryMethodID
            inner join dbo.InvoiceLines ivl on iv.InvoiceID = ivl.InvoiceID
            where 
                (@InvoiceID is null or iv.InvoiceID = @InvoiceID)
                and (@InvoiceDateFrom  is null or iv.InvoiceDate >= @InvoiceDateFrom)
                and (@InvoiceDateTo is null or iv.InvoiceDate < dateadd(day, 1, @InvoiceDateTo))
                and (@CustomerName  is null or cs.CustomerName like '%' + @CustomerName + '%')
                and (@DeliveryMethodID is null or iv.DeliveryMethodID = @DeliveryMethodID)
            group by iv.InvoiceID
            having (@MinInvoiceAmount is null or sum(ivl.ExtendedPrice) >= @MinInvoiceAmount)
               and (@MaxInvoiceAmount is null or sum(ivl.ExtendedPrice) <= @MaxInvoiceAmount)
        ) t

        select
            iv.InvoiceID as NumeroFactura,
            iv.InvoiceDate as FechaFactura,
            cs.CustomerName as NombreCliente,
            dv.DeliveryMethodName as NombreMetodoEntrega,
            sum(ivl.ExtendedPrice) as MontoFacturado
        from dbo.Invoices iv
        inner join dbo.Customers cs on iv.CustomerID = cs.CustomerID
        inner join dbo.DeliveryMethods dv on iv.DeliveryMethodID = dv.DeliveryMethodID
        inner join dbo.InvoiceLines ivl on iv.InvoiceID = ivl.InvoiceID
        where 
            (@InvoiceID is null or iv.InvoiceID = @InvoiceID)
            and (@InvoiceDateFrom  is null or iv.InvoiceDate >= @InvoiceDateFrom)
            and (@InvoiceDateTo is null or iv.InvoiceDate < dateadd(day, 1, @InvoiceDateTo))
            and (@CustomerName  is null or cs.CustomerName like '%' + @CustomerName + '%')
            and (@DeliveryMethodID is null or iv.DeliveryMethodID = @DeliveryMethodID)
        group by iv.InvoiceID, iv.InvoiceDate, cs.CustomerName, dv.DeliveryMethodName
        having (@MinInvoiceAmount is null or sum(ivl.ExtendedPrice) >= @MinInvoiceAmount)
            and (@MaxInvoiceAmount is null or sum(ivl.ExtendedPrice) <= @MaxInvoiceAmount)
        order by cs.CustomerName, iv.InvoiceID
        offset(@PageNumber - 1) * @PageSize rows
        fetch next @PageSize rows only
    end
go

/*
    Obtiene el encabezado de una factura específica: número, cliente, método de entrega, número de orden, persona de contacto,
    vendedor, fecha e instrucciones de entrega.
    Devuelve: numeroFactura, nombreCliente, nombreMetodoEntrega, numeroOrden, nombreContacto, nombreVendedor, fechaFactura, instruccionesEntrega
*/
create or alter procedure Sales.GetInvoiceHeader
    @InvoiceID int
as
    begin
        set nocount on
        select
            iv.InvoiceID as NumeroFactura,
            cs.CustomerName as NombreCliente,
            dv.DeliveryMethodName as NombreMetodoEntrega,
            iv.CustomerPurchaseOrderNumber as NumeroOrden,
            cp.FullName as NombreContacto,
            sp.FullName as NombreVendedor,
            iv.InvoiceDate as FechaFactura,
            iv.DeliveryInstructions as InstruccionesEntrega
        from dbo.Invoices iv
        inner join dbo.Customers cs on iv.CustomerID = cs.CustomerID
        inner join dbo.DeliveryMethods dv on iv.DeliveryMethodID = dv.DeliveryMethodID
        inner join dbo.People cp on iv.ContactPersonID = cp.PersonID
        inner join dbo.People sp on iv.SalespersonPersonID = sp.PersonID
        where iv.InvoiceID = @InvoiceID
    end
go

/*
    Devuelve los valores editables de la factura.
*/
create or alter procedure Sales.GetInvoiceForEdit
    @InvoiceID int
as
begin
    set nocount on
    select iv.InvoiceID, iv.CustomerID, cs.CustomerName,
           iv.BillToCustomerID, bill.CustomerName as BillToCustomerName,
           iv.DeliveryMethodID, iv.ContactPersonID, cp.FullName as ContactPersonName,
           iv.AccountsPersonID, ap.FullName as AccountsPersonName,
           iv.PackedByPersonID, pp.FullName as PackedByPersonName,
           iv.LastEditedBy, ed.FullName as LastEditorName,
           iv.SalespersonPersonID, sp.FullName as SalespersonName,
           iv.CustomerPurchaseOrderNumber, iv.InvoiceDate, iv.DeliveryInstructions
    from dbo.Invoices iv
    join dbo.Customers cs on cs.CustomerID = iv.CustomerID
    join dbo.Customers bill on bill.CustomerID = iv.BillToCustomerID
    inner join dbo.People cp on cp.PersonID = iv.ContactPersonID
    inner join dbo.People ap on ap.PersonID = iv.AccountsPersonID
    inner join dbo.People pp on pp.PersonID = iv.PackedByPersonID
    inner join dbo.People ed on ed.PersonID = iv.LastEditedBy
    inner join dbo.People sp on sp.PersonID = iv.SalespersonPersonID
    where iv.InvoiceID = @InvoiceID
end
go

/*
    Obtiene las líneas de detalle (productos) de una factura específica.
    Devuelve: StockItemID, nombreProducto, cantidad, precioUnitario, impuestoAplicado, montoImpuesto, totalLinea
*/
create or alter procedure Sales.GetInvoiceLines
    @InvoiceID int
as
    begin
        set nocount on
        select
            ivl.StockItemID,
            si.StockItemName as NombreProducto,
            ivl.Quantity as Cantidad,
            ivl.UnitPrice as PrecioUnitario,
            ivl.TaxRate as ImpuestoAplicado,
            ivl.TaxAmount as MontoImpuesto,
            ivl.ExtendedPrice as TotalLinea
        from dbo.InvoiceLines ivl
        inner join dbo.StockItems si on ivl.StockItemID = si.StockItemID
        where ivl.InvoiceID = @InvoiceID
        order by ivl.InvoiceLineID
    end
go

/*
    Devuelve los años distintos en los que se registraron facturas.
    Devuelve: Año
*/
create or alter procedure Sales.GetInvoiceYears
as
	begin
		set nocount on
		select distinct year(InvoiceDate) as Año
		from dbo.Invoices
		order by Año
	end
go

/*
   Inserta una factura completa: encabezado en Invoices y líneas de detalle en InvoiceLines.
   Recibe las líneas como JSON (@LinesJson), calcula TotalDryItems, TotalChillerItems,
   impuestos, ganancia y precio extendido por línea. Devuelve el InvoiceID generado en
   @NewInvoiceID.
*/
create or alter procedure Sales.InsertInvoice
    @CustomerID int,
    @BillToCustomerID int = null,
    @DeliveryMethodID int,
    @ContactPersonID int,
    @AccountsPersonID int,
    @PackedByPersonID int,
    @LastEditedBy int,
    @SalespersonPersonID int = null,
    @CustomerPurchaseOrderNumber nvarchar(20) = null,
    @InvoiceDate date,
    @DeliveryInstructions nvarchar(100) = null,
    @LinesJson nvarchar(max),
    @NewInvoiceID int output
as
    begin
        set nocount on
        begin try
            begin transaction
                declare @InsertedIDs table (InvoiceID int)
                declare @TotalDryItems int, @TotalChillerItems int;
                select @TotalDryItems = coalesce(sum(case when si.IsChillerStock = 0 then j.Quantity else 0 end), 0),
                       @TotalChillerItems = coalesce(sum(case when si.IsChillerStock = 1 then j.Quantity else 0 end), 0)
                from openjson(@LinesJson) with (StockItemID int '$.StockItemID', Quantity int '$.Quantity') j
                join dbo.StockItems si on si.StockItemID = j.StockItemID;
                insert into dbo.Invoices (
                    CustomerID, BillToCustomerID, DeliveryMethodID,
                    ContactPersonID, AccountsPersonID, SalespersonPersonID, PackedByPersonID,
                    CustomerPurchaseOrderNumber, InvoiceDate, DeliveryInstructions,
                    IsCreditNote, TotalDryItems, TotalChillerItems, LastEditedBy
                )
                output inserted.InvoiceID into @InsertedIDs
                values (
                    @CustomerID, isnull(@BillToCustomerID, @CustomerID), @DeliveryMethodID,
                    @ContactPersonID, @AccountsPersonID, @SalespersonPersonID, @PackedByPersonID,
                    @CustomerPurchaseOrderNumber, @InvoiceDate, @DeliveryInstructions,
                    0, @TotalDryItems, @TotalChillerItems, @LastEditedBy
                )
                select @NewInvoiceID = InvoiceID from @InsertedIDs
                insert into dbo.InvoiceLines (
                    InvoiceID, StockItemID, Description, PackageTypeID,
                    Quantity, UnitPrice, TaxRate, TaxAmount, LineProfit, ExtendedPrice, LastEditedBy
                )
                select
                    @NewInvoiceID,
                    j.StockItemID,
                    si.StockItemName,
                    si.UnitPackageID,
                    j.Quantity,
                    j.UnitPrice,
                    si.TaxRate,
                    round(j.Quantity * j.UnitPrice * si.TaxRate / 100.0, 2),
                    round(j.Quantity * (j.UnitPrice - coalesce(sih.LastCostPrice, 0)), 2),
                    round(j.Quantity * j.UnitPrice * (1 + si.TaxRate / 100.0), 2),
                    @LastEditedBy
                from openjson(@LinesJson)
                with (
                    StockItemID int '$.StockItemID',
                    Quantity int '$.Quantity',
                    UnitPrice decimal(18, 2) '$.UnitPrice'
                ) j
                inner join dbo.StockItems si on j.StockItemID = si.StockItemID
                left join dbo.StockItemHoldings sih on sih.StockItemID = si.StockItemID

                if not exists (select 1 from dbo.InvoiceLines where InvoiceID = @NewInvoiceID)
                    throw 54000, 'La factura debe tener al menos una línea de producto.', 1
            commit transaction
            print 'Factura insertada correctamente. Nuevo InvoiceID = ' + cast(@NewInvoiceID as varchar(20)) + ' (Cliente: ' + cast(@CustomerID as varchar(20)) + ')';
        end try
        begin catch
            if @@trancount > 0
                rollback transaction;
            ;throw;
        end catch
    end
go

/*
   Actualiza una factura existente: encabezado en Invoices y reemplaza todas las líneas
   en InvoiceLines. Si la factura no existe, lanza error 54001.
*/
create or alter procedure Sales.UpdateInvoice
    @InvoiceID int,
    @CustomerID int,
    @BillToCustomerID int = null,
    @DeliveryMethodID int,
    @ContactPersonID int,
    @AccountsPersonID int,
    @PackedByPersonID int,
    @LastEditedBy int,
    @SalespersonPersonID int = null,
    @CustomerPurchaseOrderNumber nvarchar(20) = null,
    @InvoiceDate date,
    @DeliveryInstructions nvarchar(100) = null,
    @LinesJson nvarchar(max)
as
    begin
        set nocount on
        begin try
            begin transaction
                declare @TotalDryItems int, @TotalChillerItems int;
                select @TotalDryItems = coalesce(sum(case when si.IsChillerStock = 0 then j.Quantity else 0 end), 0),
                       @TotalChillerItems = coalesce(sum(case when si.IsChillerStock = 1 then j.Quantity else 0 end), 0)
                from openjson(@LinesJson) with (StockItemID int '$.StockItemID', Quantity int '$.Quantity') j
                join dbo.StockItems si on si.StockItemID = j.StockItemID;

                update dbo.Invoices
                set
                    CustomerID = @CustomerID,
                    BillToCustomerID = isnull(@BillToCustomerID, @CustomerID),
                    DeliveryMethodID = @DeliveryMethodID,
                    ContactPersonID = @ContactPersonID,
                    AccountsPersonID = @AccountsPersonID,
                    PackedByPersonID = @PackedByPersonID,
                    TotalDryItems = @TotalDryItems,
                    TotalChillerItems = @TotalChillerItems,
                    LastEditedBy = @LastEditedBy,
                    SalespersonPersonID = @SalespersonPersonID,
                    CustomerPurchaseOrderNumber = @CustomerPurchaseOrderNumber,
                    InvoiceDate = @InvoiceDate,
                    DeliveryInstructions = @DeliveryInstructions
                where InvoiceID = @InvoiceID

                if @@rowcount = 0
                    throw 54001, 'La factura indicada no existe.', 1

                delete from dbo.InvoiceLines
                where InvoiceID = @InvoiceID

                insert into dbo.InvoiceLines (
                    InvoiceID, StockItemID, Description, PackageTypeID,
                    Quantity, UnitPrice, TaxRate, TaxAmount, LineProfit, ExtendedPrice, LastEditedBy
                )
                select
                    @InvoiceID,
                    j.StockItemID,
                    si.StockItemName,
                    si.UnitPackageID,
                    j.Quantity,
                    j.UnitPrice,
                    si.TaxRate,
                    round(j.Quantity * j.UnitPrice * si.TaxRate / 100.0, 2),
                    round(j.Quantity * (j.UnitPrice - coalesce(sih.LastCostPrice, 0)), 2),
                    round(j.Quantity * j.UnitPrice * (1 + si.TaxRate / 100.0), 2),
                    @LastEditedBy
                from openjson(@LinesJson)
                with (
                    StockItemID int '$.StockItemID',
                    Quantity int '$.Quantity',
                    UnitPrice decimal(18, 2) '$.UnitPrice'
                ) j
                inner join dbo.StockItems si on j.StockItemID = si.StockItemID
                left join dbo.StockItemHoldings sih on sih.StockItemID = si.StockItemID

                if not exists (select 1 from dbo.InvoiceLines where InvoiceID = @InvoiceID)
                    throw 54002, 'La factura debe tener al menos una línea de producto.', 1
            commit transaction
            print 'Factura actualizada correctamente. InvoiceID = ' + cast(@InvoiceID as varchar(20)) + ' (Cliente: ' + cast(@CustomerID as varchar(20)) + ')';
        end try
        begin catch
            if @@trancount > 0
                rollback transaction;
            ;throw;
        end catch
    end
go

/*
   Elimina una factura por su InvoiceID, borrando primero las líneas de detalle en
   InvoiceLines y luego el encabezado en Invoices. Si no existe, lanza error 54003.
*/
create or alter procedure Sales.DeleteInvoice
    @InvoiceID int
as
    begin
        set nocount on
        begin try
            begin transaction
                delete from dbo.InvoiceLines
                where InvoiceID = @InvoiceID

                delete from dbo.Invoices
                where InvoiceID = @InvoiceID

                if @@rowcount = 0
                    throw 54003, 'La factura indicada no existe.', 1
            commit transaction
            print 'Factura eliminada correctamente. InvoiceID = ' + cast(@InvoiceID as varchar(20));
        end try
        begin catch
            if @@trancount > 0
                rollback transaction;
            ;throw;
        end catch
    end
go
