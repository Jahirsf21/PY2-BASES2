use WideWorldImporters;
go
if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;
go

-- ======================================================================================
-- Sinonimos
-- ======================================================================================
drop synonym if exists dbo.Customers;
create synonym dbo.Customers for Sales.Customers;
go
drop synonym if exists dbo.CustomerCategories;
create synonym dbo.CustomerCategories for Sales.CustomerCategories;
go
drop synonym if exists dbo.CustomerTransactions;
create synonym dbo.CustomerTransactions for Sales.CustomerTransactions;
go
drop synonym if exists dbo.BuyingGroups;
create synonym dbo.BuyingGroups for Sales.BuyingGroups;
go
drop synonym if exists dbo.DeliveryMethods;
create synonym dbo.DeliveryMethods for Application.DeliveryMethods;
go
drop synonym if exists dbo.Suppliers;
create synonym dbo.Suppliers for Purchasing.Suppliers;
go
drop synonym if exists dbo.SupplierCategories;
create synonym dbo.SupplierCategories for Purchasing.SupplierCategories;
go
drop synonym if exists dbo.StockItems;
create synonym dbo.StockItems for Warehouse.StockItems;
go
drop synonym if exists dbo.StockItemTransactions;
create synonym dbo.StockItemTransactions for Warehouse.StockItemTransactions;
go
drop synonym if exists dbo.StockItemHoldings;
create synonym dbo.StockItemHoldings for Warehouse.StockItemHoldings;
go
drop synonym if exists dbo.StockItemStockGroups;
create synonym dbo.StockItemStockGroups for Warehouse.StockItemStockGroups;
go
drop synonym if exists dbo.StockGroups;
create synonym dbo.StockGroups for Warehouse.StockGroups;
go
drop synonym if exists dbo.Colors;
create synonym dbo.Colors for Warehouse.Colors;
go
drop synonym if exists dbo.PackageTypes;
create synonym dbo.PackageTypes for Warehouse.PackageTypes;
go
drop synonym if exists dbo.Orders;
create synonym dbo.Orders for Sales.Orders;
go
drop synonym if exists dbo.OrderLines;
create synonym dbo.OrderLines for Sales.OrderLines;
go
drop synonym if exists dbo.Invoices;
create synonym dbo.Invoices for Sales.Invoices;
go
drop synonym if exists dbo.InvoiceLines;
create synonym dbo.InvoiceLines for Sales.InvoiceLines;
go
drop synonym if exists dbo.People;
create synonym dbo.People for Application.People;
go
drop synonym if exists dbo.Cities;
create synonym dbo.Cities for Application.Cities;
go
drop synonym if exists dbo.Countries;
create synonym dbo.Countries for Application.Countries;
go
drop synonym if exists dbo.StateProvinces;
create synonym dbo.StateProvinces for Application.StateProvinces;
go
drop synonym if exists dbo.PurchaseOrders;
create synonym dbo.PurchaseOrders for Purchasing.PurchaseOrders;
go
drop synonym if exists dbo.PurchaseOrderLines;
create synonym dbo.PurchaseOrderLines for Purchasing.PurchaseOrderLines;
go