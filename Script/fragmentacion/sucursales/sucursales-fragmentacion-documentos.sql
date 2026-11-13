use WideWorldImporters;

if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;

-- ======================================================================================
-- (FRAGMENTACIÓN DE FACTURAS Y COMPRAS)
-- ======================================================================================

/*
    Conserva los documentos pares en San José y los impares en Limón, con sus líneas y movimientos.
    Conserva los movimientos sin documento asociado y las claves foráneas; ajusta las secuencias sin colisiones.
    Requiere que los datos originales estén completos en Corporativo.
    Requiere que los límites estén revisados y las restricciones de propiedad no existan.
*/
set nocount on;

declare @Node nvarchar(128) = coalesce(convert(nvarchar(128), serverproperty('MachineName')), N'');

if @Node not in (N'san-jose', N'limon')
    throw 57001, 'El nodo indicado no corresponde a una sucursal.', 1;

declare @Parity int = case when @Node = N'san-jose' then 0 else 1 end;

if object_id(N'Sales.CK_Sales_Invoices_Sucursal', N'C') is not null
    or object_id(N'Purchasing.CK_Purchasing_PurchaseOrders_Sucursal', N'C') is not null
    throw 57011, 'Las restricciones de propiedad ya existen.', 1;

set xact_abort on;

begin try
    begin transaction;

    /*
        Verifica que las secuencias no superen los límites revisados.
    */
    if exists (
        select 1
        from sys.sequences
        where schema_id = schema_id(N'Sequences')
          and (
              (name = N'InvoiceID' and (convert(bigint, current_value) > 70511 or convert(bigint, last_used_value) > 70511))
              or (name = N'InvoiceLineID' and (convert(bigint, current_value) > 228266 or convert(bigint, last_used_value) > 228266))
              or (name = N'PurchaseOrderID' and (convert(bigint, current_value) > 2075 or convert(bigint, last_used_value) > 2075))
              or (name = N'PurchaseOrderLineID' and (convert(bigint, current_value) > 8368 or convert(bigint, last_used_value) > 8368))
          )
    )
        throw 57012, 'Las secuencias superan los límites revisados.', 1;

    /*
        Verifica los límites de los identificadores de documentos y líneas.
    */
    if (select max(InvoiceID) from Sales.Invoices) > 70510
        or (select max(InvoiceLineID) from Sales.InvoiceLines) > 228265
        or (select max(PurchaseOrderID) from Purchasing.PurchaseOrders) > 2074
        or (select max(PurchaseOrderLineID) from Purchasing.PurchaseOrderLines) > 8367
        throw 57012, 'Existen identificadores posteriores a los límites revisados.', 1;

    /*
        Retira movimientos de la otra sucursal y conserva los que no tienen documento asociado.
    */
    delete from Warehouse.StockItemTransactions
    where (InvoiceID is not null and InvoiceID % 2 <> @Parity)
       or (PurchaseOrderID is not null and PurchaseOrderID % 2 <> @Parity);

    delete from Sales.CustomerTransactions
    where InvoiceID is not null and InvoiceID % 2 <> @Parity;

    delete from Purchasing.SupplierTransactions
    where PurchaseOrderID is not null and PurchaseOrderID % 2 <> @Parity;

    /*
        Retira las líneas de los documentos de la otra sucursal.
    */
    delete from Sales.InvoiceLines where InvoiceID % 2 <> @Parity;
    delete from Purchasing.PurchaseOrderLines where PurchaseOrderID % 2 <> @Parity;

    /*
        Retira las cabeceras al final para respetar las claves foráneas.
    */
    delete from Sales.Invoices where InvoiceID % 2 <> @Parity;
    delete from Purchasing.PurchaseOrders where PurchaseOrderID % 2 <> @Parity;

    /*
        Ajusta las secuencias y agrega las restricciones según la paridad del nodo.
    */
    if @Parity = 0
    begin
        alter sequence Sequences.InvoiceID restart with 70512 increment by 2 no cycle;
        alter sequence Sequences.InvoiceLineID restart with 228268 increment by 2 no cycle;
        alter sequence Sequences.PurchaseOrderID restart with 2076 increment by 2 no cycle;
        alter sequence Sequences.PurchaseOrderLineID restart with 8370 increment by 2 no cycle;

        alter table Sales.Invoices with check
            add constraint CK_Sales_Invoices_Sucursal check (InvoiceID % 2 = 0);
        alter table Purchasing.PurchaseOrders with check
            add constraint CK_Purchasing_PurchaseOrders_Sucursal check (PurchaseOrderID % 2 = 0);
    end
    else
    begin
        alter sequence Sequences.InvoiceID restart with 70513 increment by 2 no cycle;
        alter sequence Sequences.InvoiceLineID restart with 228267 increment by 2 no cycle;
        alter sequence Sequences.PurchaseOrderID restart with 2077 increment by 2 no cycle;
        alter sequence Sequences.PurchaseOrderLineID restart with 8369 increment by 2 no cycle;

        alter table Sales.Invoices with check
            add constraint CK_Sales_Invoices_Sucursal check (InvoiceID % 2 = 1);
        alter table Purchasing.PurchaseOrders with check
            add constraint CK_Purchasing_PurchaseOrders_Sucursal check (PurchaseOrderID % 2 = 1);
    end;

    commit transaction;
end try
begin catch
    if @@trancount > 0
        rollback transaction;
    ;throw;
end catch;
