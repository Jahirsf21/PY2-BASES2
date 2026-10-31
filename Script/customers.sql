use WideWorldImporters;
go
if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;
go

-- ======================================================================================
-- CLIENTES
-- ======================================================================================

/*
    Obtiene los clientes paginados, ordenados por nombre y luego por identificador.
    Incluye el total de registros (TotalCount) para calcular la paginación en el cliente.
    Devuelve: CustomerID, NombreCliente, NombreCategoriaCliente, NombreMetodoEntrega
*/
create or alter procedure Sales.GetCustomers
    @CustomerName nvarchar(100) = null,
    @CustomerCategoryID int = null,
    @DeliveryMethodID int = null,
    @PageNumber int = 1,
    @PageSize int = 10,
    @TotalCount int = 0 output
as
    begin
        set nocount on;
        if @CustomerCategoryID is not null and not exists (select 1 from dbo.CustomerCategories where CustomerCategoryID = @CustomerCategoryID)
            throw 51003, 'La categoría de cliente indicada no existe.', 1;
        if @DeliveryMethodID is not null and not exists (select 1 from dbo.DeliveryMethods where DeliveryMethodID = @DeliveryMethodID)
            throw 51004, 'El método de entrega indicado no existe.', 1;
        select @TotalCount = count(*) from dbo.Customers cs
        inner join dbo.CustomerCategories cg on cs.CustomerCategoryID = cg.CustomerCategoryID
        inner join dbo.DeliveryMethods dv on cs.DeliveryMethodID = dv.DeliveryMethodID
        where
            (@CustomerName is null or cs.CustomerName like '%' + @CustomerName + '%')
            and (@CustomerCategoryID is null or cs.CustomerCategoryID = @CustomerCategoryID)
            and (@DeliveryMethodID is null or cs.DeliveryMethodID = @DeliveryMethodID)

        select
            cs.CustomerID,
            cs.CustomerName as NombreCliente,
            cg.CustomerCategoryName as NombreCategoriaCliente,
            dv.DeliveryMethodName as NombreMetodoEntrega
        from dbo.Customers cs
        inner join dbo.CustomerCategories cg on cs.CustomerCategoryID = cg.CustomerCategoryID
        inner join dbo.DeliveryMethods dv on cs.DeliveryMethodID = dv.DeliveryMethodID
        where
            (@CustomerName is null or cs.CustomerName like '%' + @CustomerName + '%')
            and (@CustomerCategoryID is null or cs.CustomerCategoryID = @CustomerCategoryID)
            and (@DeliveryMethodID is null or cs.DeliveryMethodID = @DeliveryMethodID)
        order by cs.CustomerName, cs.CustomerID
        offset(@PageNumber - 1) * @PageSize rows
        fetch next @PageSize rows only
    end
go

/*
    Obtiene el listado de clientes (ID y nombre) paginado, ordenado por nombre e identificador.
    Permite filtrar opcionalmente por nombre de cliente.
    Incluye el total de registros (TotalCount) para calcular la paginación en el cliente.
    Devuelve: CustomerID, NombreCliente
*/
create or alter procedure Sales.GetBillToCustomers
    @CustomerName nvarchar(100) = null,
    @PageNumber int = 1,
    @PageSize int = 10,
    @TotalCount int = 0 output
as
    begin
        set nocount on
        select @TotalCount = count(*) from dbo.Customers
        where @CustomerName is null or CustomerName like '%' + @CustomerName + '%'
        select
            CustomerID,
            CustomerName as NombreCliente
        from dbo.Customers
        where @CustomerName is null or CustomerName like '%' + @CustomerName + '%'
        order by CustomerName, CustomerID
        offset(@PageNumber - 1) * @PageSize rows
        fetch next @PageSize rows only
    end
go

/*
    Obtiene el detalle general de un cliente:
    nombre, categoría, buying group, cliente por facturar, método de entrega, días de gracia, sitio web.
    Devuelve: CustomerID, NombreCliente, NombreCategoriaCliente, NombreGrupoCompra, NombreClientePorFacturar, NombreMetodoEntrega, DiasGraciaPago, SitioWeb
*/
create or alter procedure Sales.GetCustomerDetail
    @CustomerID int
as
    begin
        set nocount on
        select
            cs.CustomerID,
            cs.CustomerName as NombreCliente,
            cg.CustomerCategoryName as NombreCategoriaCliente,
            bg.BuyingGroupName as NombreGrupoCompra,
            bill.CustomerName as NombreClientePorFacturar,
            dv.DeliveryMethodName as NombreMetodoEntrega,
            cs.PaymentDays as DiasGraciaPago,
            cs.WebSiteURL as SitioWeb
        from dbo.Customers cs
        inner join dbo.CustomerCategories cg on cs.CustomerCategoryID = cg.CustomerCategoryID
        left join dbo.BuyingGroups bg on cs.BuyingGroupID = bg.BuyingGroupID
        inner join dbo.DeliveryMethods dv on cs.DeliveryMethodID = dv.DeliveryMethodID
        inner join dbo.Customers bill on bill.CustomerID = cs.BillToCustomerID
        where cs.CustomerID = @CustomerID
    end
go

/*
    Devuelve los valores editables del cliente y los nombres de sus referencias. La ciudad y el código postal
    de ambas direcciones se comparten y solo se devuelven una vez.
*/
create or alter procedure Sales.GetCustomerForEdit
    @CustomerID int
as
    begin
        set nocount on
        select
            cs.CustomerID,
            cs.CustomerName as NombreCliente,
            cs.CustomerCategoryID,
            cs.BillToCustomerID,
            bill.CustomerName as NombreClientePorFacturar,
            cs.LastEditedBy,
            cs.StandardDiscountPercentage as PorcentajeDescuentoEstandar,
            cs.CreditLimit as LimiteCredito,
            cs.IsStatementSent as EnviarEstadoCuenta,
            cs.IsOnCreditHold as CreditoSuspendido,
            cs.BuyingGroupID,
            cs.PrimaryContactPersonID,
            pp.FullName as NombreContactoPrincipal,
            cs.AlternateContactPersonID,
            pa.FullName as NombreContactoAlternativo,
            cs.DeliveryMethodID,
            cs.PaymentDays as DiasGraciaPago,
            cs.PhoneNumber as Telefono,
            cs.FaxNumber as Fax,
            cs.WebsiteURL as SitioWeb,
            cs.DeliveryAddressLine1 as DireccionEntrega1,
            cs.DeliveryAddressLine2 as DireccionEntrega2,
            cs.DeliveryCityID,
            concat(ci.CityName, ', ', sp.StateProvinceName, ', ', co.CountryName) as CiudadEntrega,
            cs.DeliveryPostalCode as CodigoPostalEntrega,
            cs.PostalAddressLine1 as DireccionPostal1,
            cs.PostalAddressLine2 as DireccionPostal2,
            cs.DeliveryLocation.Lat as Latitud,
            cs.DeliveryLocation.Long as Longitud
        from dbo.Customers cs
        inner join dbo.Customers bill on bill.CustomerID = cs.BillToCustomerID
        inner join dbo.People pp on pp.PersonID = cs.PrimaryContactPersonID
        left join dbo.People pa on pa.PersonID = cs.AlternateContactPersonID
        inner join dbo.Cities ci on ci.CityID = cs.DeliveryCityID
        inner join dbo.StateProvinces sp on sp.StateProvinceID = ci.StateProvinceID
        inner join dbo.Countries co on co.CountryID = sp.CountryID
        where cs.CustomerID = @CustomerID
    end
go

/*
    Obtiene los contactos (principal y alternativo) de un cliente específico.
    Devuelve: una fila con el nombre, teléfono, fax y correo de ambos contactos.
*/
create or alter procedure Sales.GetCustomerContacts
    @CustomerID int
as
    begin
        set nocount on
        select
            pp.FullName as NombreContactoPrincipal,
            pp.PhoneNumber as TelefonoPrincipal,
            pp.FaxNumber AS FaxPrincipal,
            pp.EmailAddress as CorreoPrincipal,
            pa.FullName as NombreContactoAlternativo,
            pa.PhoneNumber as TelefonoAlternativo,
            pa.FaxNumber as FaxAlternativo,
            pa.EmailAddress as CorreoAlternativo
        from dbo.Customers cs
        inner join dbo.People pp on cs.PrimaryContactPersonID = pp.PersonID
        left join dbo.People pa on cs.AlternateContactPersonID = pa.PersonID
        where cs.CustomerID = @CustomerID
    end
go

/*
    Obtiene las direcciones de entrega y postal de un cliente,
    junto con su ubicación geográfica (latitud/longitud) para el mapa.
    Devuelve: una fila con ambas direcciones y las coordenadas.
*/
create or alter procedure Sales.GetCustomerAddress
    @CustomerID int
as
    begin
        set nocount on
        select
            cs.DeliveryAddressLine1 as DireccionEntrega1,
            cs.DeliveryAddressLine2 as DireccionEntrega2,
            ci.CityName as CiudadEntrega,
            sp.StateProvinceName as ProvinciaEntrega,
            co.CountryName as PaisEntrega,
            cs.DeliveryPostalCode as CodigoPostalEntrega,
            cs.PostalAddressLine1 as DireccionPostal1,
            cs.PostalAddressLine2 as DireccionPostal2,
            ci2.CityName as CiudadPostal,
            sp2.StateProvinceName as ProvinciaPostal,
            co2.CountryName as PaisPostal,
            cs.PostalPostalCode as CodigoPostalPostal,
            cs.DeliveryLocation.Lat as Latitud,
            cs.DeliveryLocation.Long as Longitud
        from dbo.Customers cs
        inner join dbo.Cities ci on cs.DeliveryCityID = ci.CityID
        inner join dbo.StateProvinces sp on ci.StateProvinceID = sp.StateProvinceID
        inner join dbo.Countries co on sp.CountryID = co.CountryID
        inner join dbo.Cities ci2 on cs.PostalCityID = ci2.CityID
        inner join dbo.StateProvinces sp2 on ci2.StateProvinceID = sp2.StateProvinceID
        inner join dbo.Countries co2 on sp2.CountryID = co2.CountryID
        where cs.CustomerID = @CustomerID
    end
go

/*
    Obtiene todas las categorías de cliente ordenadas por su ID.
    Devuelve: CustomerCategoryID, NombreCategoria
*/
create or alter procedure Sales.GetCustomerCategories
as
    begin
        set nocount on
        select
            CustomerCategoryID,
            CustomerCategoryName as NombreCategoria
        from dbo.CustomerCategories
        order by CustomerCategoryID
    end
go

/*
    Obtiene todas las agrupaciones de compra (buying groups)
    ordenadas por su identificador.
    Devuelve: BuyingGroupID, NombreGrupoCompra
*/
create or alter procedure Sales.GetBuyingGroups
as
    begin
        set nocount on
        select
            BuyingGroupID,
            BuyingGroupName as NombreGrupoCompra
        from dbo.BuyingGroups
        order by BuyingGroupID
    end
go

/*
    Inserta un nuevo cliente en la tabla Customers. Recibe todos los datos obligatorios y opcionales del cliente,
    maneja valores por defecto (fax, web, ubicación geográfica), valida que @LastEditedBy corresponda a un
    empleado existente, y devuelve el CustomerID generado a través del parámetro de salida @NewCustomerID.
    Si @BillToCustomerID es null, el cliente nuevo se factura a sí mismo.
    La ciudad y el código postal de entrega también se guardan en la dirección postal.
*/
create or alter procedure Sales.InsertCustomer
    @CustomerName nvarchar(100),
    @CustomerCategoryID int,
    @BillToCustomerID int = null,
    @LastEditedBy int,
    @StandardDiscountPercentage decimal(18,3) = 0,
    @CreditLimit decimal(18,2) = null,
    @IsStatementSent bit = 0,
    @IsOnCreditHold bit = 0,
    @BuyingGroupID int = null,
    @PrimaryContactPersonID int,
    @AlternateContactPersonID int = null,
    @DeliveryMethodID int,
    @PaymentDays int,
    @PhoneNumber nvarchar(20),
    @FaxNumber nvarchar(20) = null,
    @WebsiteURL nvarchar(256) = null,
    @DeliveryAddressLine1 nvarchar(60),
    @DeliveryAddressLine2 nvarchar(60) = null,
    @DeliveryCityID int,
    @DeliveryPostalCode nvarchar(10),
    @PostalAddressLine1 nvarchar(60),
    @PostalAddressLine2 nvarchar(60) = null,
    @Latitude float = null,
    @Longitude float = null,
    @NewCustomerID int output
as
    begin
        set nocount on
        begin try
            if not exists (
                select 1 from dbo.People
                where PersonID = @LastEditedBy and IsEmployee = 1
            )
                throw 51002, 'El LastEditedBy indicado no corresponde a un empleado válido.', 1

            begin transaction
                set @NewCustomerID = next value for Sequences.CustomerID

                insert into dbo.Customers (
                    CustomerID, CustomerName, BillToCustomerID, CustomerCategoryID, BuyingGroupID,
                    PrimaryContactPersonID, AlternateContactPersonID, DeliveryMethodID,
                    AccountOpenedDate, StandardDiscountPercentage, CreditLimit, IsStatementSent, IsOnCreditHold,
                    PaymentDays, PhoneNumber, FaxNumber, WebsiteURL,
                    DeliveryAddressLine1, DeliveryAddressLine2, DeliveryCityID, DeliveryPostalCode,
                    PostalAddressLine1, PostalAddressLine2, PostalCityID, PostalPostalCode,
                    DeliveryLocation, LastEditedBy
                )
                values (
                    @NewCustomerID, @CustomerName, coalesce(@BillToCustomerID, @NewCustomerID), @CustomerCategoryID, @BuyingGroupID,
                    @PrimaryContactPersonID, @AlternateContactPersonID, @DeliveryMethodID,
                    convert(date, getdate()),
                    @StandardDiscountPercentage, @CreditLimit, @IsStatementSent, @IsOnCreditHold,
                    @PaymentDays, @PhoneNumber, coalesce(@FaxNumber,N''), coalesce(@WebsiteURL,N''),
                    @DeliveryAddressLine1, @DeliveryAddressLine2, @DeliveryCityID, @DeliveryPostalCode,
                    @PostalAddressLine1, @PostalAddressLine2, @DeliveryCityID, @DeliveryPostalCode,
                    case when @Latitude is not null and @Longitude is not null
                         then geography::Point(@Latitude, @Longitude, 4326)
                         else null end, @LastEditedBy
                )

            commit transaction
            print 'Cliente insertado correctamente. Nuevo CustomerID = '  + cast(@NewCustomerID as varchar(20)) + ' (' + @CustomerName + ')';
        end try
        begin catch
            if @@trancount > 0
                rollback transaction;
            ;throw;
        end catch
    end
go

/*
    Actualiza la información de un cliente existente. Recibe el @CustomerID y todos los campos editables.
    Valida que @LastEditedBy corresponda a un empleado existente antes de aplicar cualquier cambio.
    Si el cliente no existe, lanza un error personalizado (51000). La columna DeliveryLocation solo se actualiza
    si se envían latitud y longitud; de lo contrario, conserva el valor previo. AccountOpenedDate nunca se toca
    aquí, ya que es un dato histórico fijado solo al crear el cliente.
    La ciudad y el código postal de entrega también actualizan los valores postales.
*/
create or alter procedure Sales.UpdateCustomer
    @CustomerID int,
    @CustomerName nvarchar(100),
    @CustomerCategoryID int,
    @BillToCustomerID int,
    @LastEditedBy int,
    @StandardDiscountPercentage decimal(18,3) = 0,
    @CreditLimit decimal(18,2) = null,
    @IsStatementSent bit = 0,
    @IsOnCreditHold bit = 0,
    @BuyingGroupID int = null,
    @PrimaryContactPersonID int,
    @AlternateContactPersonID int = null,
    @DeliveryMethodID int,
    @PaymentDays int,
    @PhoneNumber nvarchar(20),
    @FaxNumber nvarchar(20) = null,
    @WebsiteURL nvarchar(256) = null,
    @DeliveryAddressLine1 nvarchar(60),
    @DeliveryAddressLine2 nvarchar(60) = null,
    @DeliveryCityID int,
    @DeliveryPostalCode nvarchar(10),
    @PostalAddressLine1 nvarchar(60),
    @PostalAddressLine2 nvarchar(60) = null,
    @Latitude float = null,
    @Longitude float = null
as
    begin
        set nocount on
        begin try
            if not exists (
                select 1 from dbo.People
                where PersonID = @LastEditedBy and IsEmployee = 1
            )
                throw 51002, 'El LastEditedBy indicado no corresponde a un empleado válido.', 1

            begin transaction
                update dbo.Customers
                set
                    CustomerName = @CustomerName,
                    BillToCustomerID = @BillToCustomerID,
                    LastEditedBy = @LastEditedBy,
                    CustomerCategoryID = @CustomerCategoryID,
                    StandardDiscountPercentage = @StandardDiscountPercentage,
                    CreditLimit = @CreditLimit,
                    IsStatementSent = @IsStatementSent,
                    IsOnCreditHold = @IsOnCreditHold,
                    BuyingGroupID = @BuyingGroupID,
                    PrimaryContactPersonID = @PrimaryContactPersonID,
                    AlternateContactPersonID = @AlternateContactPersonID,
                    DeliveryMethodID = @DeliveryMethodID,
                    PaymentDays = @PaymentDays,
                    PhoneNumber = @PhoneNumber,
                    FaxNumber = coalesce(@FaxNumber,N''),
                    WebsiteURL = coalesce(@WebsiteURL,N''),
                    DeliveryAddressLine1 = @DeliveryAddressLine1,
                    DeliveryAddressLine2 = @DeliveryAddressLine2,
                    DeliveryCityID = @DeliveryCityID,
                    DeliveryPostalCode = @DeliveryPostalCode,
                    PostalAddressLine1 = @PostalAddressLine1,
                    PostalAddressLine2 = @PostalAddressLine2,
                    PostalCityID = @DeliveryCityID,
                    PostalPostalCode = @DeliveryPostalCode,
                    DeliveryLocation = case when @Latitude is not null and @Longitude is not null
                                             then geography::Point(@Latitude, @Longitude, 4326)
                                             else DeliveryLocation end
                where CustomerID = @CustomerID

                if @@rowcount = 0
                    throw 51000, 'El cliente indicado no existe.', 1
            commit transaction
            print 'Cliente actualizado correctamente. CustomerID = ' + cast(@CustomerID as varchar(20)) + ' (' + @CustomerName + ')';
        end try
        begin catch
            if @@trancount > 0
                rollback transaction;
            ;throw;
        end catch
    end
go

/*
    Elimina un cliente por su CustomerID. Solo permite la eliminación si el cliente no tiene facturas ni otros registros
    relacionados (FK). Si no existe, lanza error 51000; si hay violación de integridad referencial (error 547), lanza error
    51001 con un mensaje más claro.
*/
create or alter procedure Sales.DeleteCustomer
    @CustomerID int
as
    begin
        set nocount on
        begin try
            begin transaction
                delete from dbo.Customers
                where CustomerID = @CustomerID

                if @@rowcount = 0
                    throw 51000, 'El cliente indicado no existe.', 1
            commit transaction
            print 'Cliente eliminado correctamente. CustomerID = ' + cast(@CustomerID as varchar(20));
        end try
        begin catch
            if @@trancount > 0
                rollback transaction

            if error_number() = 547
                throw 51001, 'No se puede eliminar el cliente porque tiene facturas u otros registros asociados.', 1
            else
                throw
        end catch
    end
go
