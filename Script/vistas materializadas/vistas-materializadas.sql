use WideWorldImporters;
go
if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;
go
if coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'') <> N'corporativo'
    throw 57001, 'El nodo indicado no corresponde a Corporativo.', 1;
go

-- ======================================================================================
-- VISTAS MATERIALIZADAS DE LOS REPORTES (CORPORATIVO)
-- ======================================================================================

/*
    Crea en Corporativo las vistas indexadas con los totales que usan los reportes.
    Requiere que las vistas no existan.
*/

/*
    Guarda el monto facturado de cada factura, con su cliente y su fecha.
*/
create view Sales.mv_InvoiceTotals
with schemabinding
as
    select
        iv.InvoiceID,
        iv.CustomerID,
        iv.InvoiceDate,
        sum(ivl.ExtendedPrice) as InvoiceAmount,
        count_big(*) as LineCount
    from Sales.Invoices iv
    inner join Sales.InvoiceLines ivl on ivl.InvoiceID = iv.InvoiceID
    group by iv.InvoiceID, iv.CustomerID, iv.InvoiceDate;
go

create unique clustered index UX_Sales_mv_InvoiceTotals
    on Sales.mv_InvoiceTotals (InvoiceID);
go

/*
    Guarda la ganancia y el monto facturado de cada producto por año y sucursal:
    San José las facturas pares y Limón las impares.
*/
create view Sales.mv_StockItemSales
with schemabinding
as
    select
        year(iv.InvoiceDate) as InvoiceYear,
        case when iv.InvoiceID % 2 = 0 then N'san-jose' else N'limon' end as Sucursal,
        ivl.StockItemID,
        sum(ivl.LineProfit) as Profit,
        sum(ivl.ExtendedPrice) as InvoiceAmount,
        count_big(*) as LineCount
    from Sales.Invoices iv
    inner join Sales.InvoiceLines ivl on ivl.InvoiceID = iv.InvoiceID
    group by
        year(iv.InvoiceDate),
        case when iv.InvoiceID % 2 = 0 then N'san-jose' else N'limon' end,
        ivl.StockItemID;
go

create unique clustered index UX_Sales_mv_StockItemSales
    on Sales.mv_StockItemSales (InvoiceYear, Sucursal, StockItemID);
go

/*
    Guarda el monto comprado de cada orden de compra, con su proveedor y su fecha.
    Una línea sin precio esperado suma 0.
*/
create view Purchasing.mv_PurchaseOrderTotals
with schemabinding
as
    select
        po.PurchaseOrderID,
        po.SupplierID,
        po.OrderDate,
        sum(isnull(pol.OrderedOuters * pol.ExpectedUnitPricePerOuter, 0)) as OrderAmount,
        count_big(*) as LineCount
    from Purchasing.PurchaseOrders po
    inner join Purchasing.PurchaseOrderLines pol on pol.PurchaseOrderID = po.PurchaseOrderID
    group by po.PurchaseOrderID, po.SupplierID, po.OrderDate;
go

create unique clustered index UX_Purchasing_mv_PurchaseOrderTotals
    on Purchasing.mv_PurchaseOrderTotals (PurchaseOrderID);
go
