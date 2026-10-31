use WideWorldImporters;
go
if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;
go

-- ======================================================================================
-- PROVEEDORES
-- ======================================================================================

/*
    Obtiene los proveedores paginados, ordenados por nombre y luego por identificador.
    Incluye el total de registros (TotalCount) para calcular la paginación en el cliente.
    Devuelve: SupplierID, NombreProveedor, NombreCategoriaProveedor, NombreMetodoEntrega
*/
create or alter procedure Purchasing.GetSuppliers
    @SupplierName nvarchar(100) = null,
    @SupplierCategoryID int = null,
    @DeliveryMethodID int = null,
    @PageNumber int = 1,
    @PageSize int = 10,
    @TotalCount int = 0 output
as
    begin
        set nocount on;
        if @SupplierCategoryID is not null and not exists (select 1 from dbo.SupplierCategories where SupplierCategoryID = @SupplierCategoryID)
            throw 52004, 'La categoría de proveedor indicada no existe.', 1;
        if @DeliveryMethodID is not null and not exists (select 1 from dbo.DeliveryMethods where DeliveryMethodID = @DeliveryMethodID)
            throw 52005, 'El método de entrega indicado no existe.', 1;
        select @TotalCount = count(*) from dbo.Suppliers sp
        inner join dbo.SupplierCategories sg on sp.SupplierCategoryID = sg.SupplierCategoryID
        left join dbo.DeliveryMethods dv on sp.DeliveryMethodID = dv.DeliveryMethodID
        where
            (@SupplierName is null or sp.SupplierName like '%' + @SupplierName + '%')
            and (@SupplierCategoryID is null or sp.SupplierCategoryID = @SupplierCategoryID)
            and (@DeliveryMethodID is null or sp.DeliveryMethodID = @DeliveryMethodID)
        select
            sp.SupplierID,
            sp.SupplierName as NombreProveedor,
            sg.SupplierCategoryName as NombreCategoriaProveedor,
            dv.DeliveryMethodName as NombreMetodoEntrega
        from dbo.Suppliers sp
        inner join dbo.SupplierCategories sg on sp.SupplierCategoryID = sg.SupplierCategoryID
        left join dbo.DeliveryMethods dv on sp.DeliveryMethodID = dv.DeliveryMethodID
        where
            (@SupplierName is null or sp.SupplierName like '%' + @SupplierName + '%')
            and (@SupplierCategoryID is null or sp.SupplierCategoryID = @SupplierCategoryID)
            and (@DeliveryMethodID is null or sp.DeliveryMethodID = @DeliveryMethodID)
        order by sp.SupplierName, sp.SupplierID
        offset(@PageNumber - 1) * @PageSize rows
        fetch next @PageSize rows only
    end
go

/*
    Obtiene todas las categorías de proveedor ordenadas por su ID.
    Devuelve: SupplierCategoryID, NombreCategoriaProveedor
*/
create or alter procedure Purchasing.GetSupplierCategories
as
    begin
        set nocount on
        select
            SupplierCategoryID,
            SupplierCategoryName as NombreCategoriaProveedor
        from dbo.SupplierCategories
        order by SupplierCategoryID
    end
go

/*
    Obtiene el detalle general de un proveedor: código de referencia, nombre, categoría, método de entrega, días de gracia y datos bancarios.
    Devuelve: SupplierID, CodigoProveedor, NombreProveedor, NombreCategoriaProveedor, NombreMetodoEntrega, DiasGraciaPago, SitioWeb,
    NombreBanco, SucursalBanco, NumeroCuentaBancaria, CodigoSwift
*/
create or alter procedure Purchasing.GetSupplierDetail
    @SupplierID int
as
    begin
        set nocount on
        select
            sp.SupplierID,
            sp.SupplierReference as CodigoProveedor,
            sp.SupplierName as NombreProveedor,
            sg.SupplierCategoryName as NombreCategoriaProveedor,
            dv.DeliveryMethodName as NombreMetodoEntrega,
            sp.PaymentDays as DiasGraciaPago,
            sp.PhoneNumber as Telefono,
            sp.FaxNumber as Fax,
            sp.WebSiteURL as SitioWeb,
            sp.BankAccountName as NombreBanco,
            sp.BankAccountBranch as SucursalBanco,
            sp.BankAccountNumber as NumeroCuentaBancaria,
            sp.BankInternationalCode as CodigoSwift
        from dbo.Suppliers sp
        inner join dbo.SupplierCategories sg on sp.SupplierCategoryID = sg.SupplierCategoryID
        left join dbo.DeliveryMethods dv on sp.DeliveryMethodID = dv.DeliveryMethodID
        where sp.SupplierID = @SupplierID
    end
go

/*
    Obtiene todos los campos editables de un proveedor y las etiquetas de sus referencias
    para precargar la actualización sin inferir identificadores de nombres.
    La ciudad y el código postal se comparten entre las dos direcciones.
*/
create or alter procedure Purchasing.GetSupplierForEdit
    @SupplierID int
as
    begin
        set nocount on
        select
            sp.SupplierID,
            sp.SupplierName as NombreProveedor,
            sp.SupplierCategoryID,
            sp.LastEditedBy,
            sp.SupplierReference as CodigoProveedor,
            sp.PrimaryContactPersonID,
            pp.FullName as NombreContactoPrincipal,
            sp.AlternateContactPersonID,
            pa.FullName as NombreContactoAlternativo,
            sp.DeliveryMethodID,
            sp.PaymentDays as DiasGraciaPago,
            sp.PhoneNumber as Telefono,
            sp.FaxNumber as Fax,
            sp.WebsiteURL as SitioWeb,
            sp.BankAccountName as NombreBanco,
            sp.BankAccountBranch as SucursalBanco,
            sp.BankAccountCode as CodigoCuentaBancaria,
            sp.BankAccountNumber as NumeroCuentaBancaria,
            sp.BankInternationalCode as CodigoSwift,
            sp.DeliveryAddressLine1 as DireccionEntrega1,
            sp.DeliveryAddressLine2 as DireccionEntrega2,
            sp.DeliveryCityID,
            concat(ci.CityName, ', ', spv.StateProvinceName, ', ', co.CountryName) as CiudadEntrega,
            sp.DeliveryPostalCode as CodigoPostalEntrega,
            sp.PostalAddressLine1 as DireccionPostal1,
            sp.PostalAddressLine2 as DireccionPostal2,
            sp.InternalComments as ComentariosInternos,
            sp.DeliveryLocation.Lat as Latitud,
            sp.DeliveryLocation.Long as Longitud
        from dbo.Suppliers sp
        inner join dbo.People pp on pp.PersonID = sp.PrimaryContactPersonID
        inner join dbo.People pa on pa.PersonID = sp.AlternateContactPersonID
        inner join dbo.Cities ci on ci.CityID = sp.DeliveryCityID
        inner join dbo.StateProvinces spv on spv.StateProvinceID = ci.StateProvinceID
        inner join dbo.Countries co on co.CountryID = spv.CountryID
        where sp.SupplierID = @SupplierID
    end
go

/*
    Obtiene los contactos (principal y alternativo) de un proveedor específico.
    Devuelve: una fila con el nombre, teléfono, fax y correo de ambos contactos.
*/
create or alter procedure Purchasing.GetSupplierContacts
    @SupplierID int
as
    begin
        set nocount on
        select
            pp.FullName as NombreContactoPrincipal,
            pp.PhoneNumber as TelefonoPrincipal,
            pp.FaxNumber as FaxPrincipal,
            pp.EmailAddress as CorreoPrincipal,
            pa.FullName as NombreContactoAlternativo,
            pa.PhoneNumber as TelefonoAlternativo,
            pa.FaxNumber as FaxAlternativo,
            pa.EmailAddress as CorreoAlternativo
        from dbo.Suppliers sp
        inner join dbo.People pp on sp.PrimaryContactPersonID = pp.PersonID
        inner join dbo.People pa on sp.AlternateContactPersonID = pa.PersonID
        where sp.SupplierID = @SupplierID
    end
go

/*
    Obtiene las direcciones de entrega y postal de un proveedor,
    junto con su ubicación geográfica (latitud/longitud) para el mapa.
    Devuelve: una fila con ambas direcciones y las coordenadas.
*/
create or alter procedure Purchasing.GetSupplierAddress
    @SupplierID int
as
    begin
        set nocount on
        select
            sp.DeliveryAddressLine1 as DireccionEntrega1,
            sp.DeliveryAddressLine2 as DireccionEntrega2,
            ci.CityName as CiudadEntrega,
            spv.StateProvinceName as ProvinciaEntrega,
            co.CountryName as PaisEntrega,
            sp.DeliveryPostalCode as CodigoPostalEntrega,
            sp.PostalAddressLine1 as DireccionPostal1,
            sp.PostalAddressLine2 as DireccionPostal2,
            ci2.CityName as CiudadPostal,
            spv2.StateProvinceName as ProvinciaPostal,
            co2.CountryName as PaisPostal,
            sp.PostalPostalCode as CodigoPostalPostal,
            sp.DeliveryLocation.Lat as Latitud,
            sp.DeliveryLocation.Long as Longitud
        from dbo.Suppliers sp
        inner join dbo.Cities ci on sp.DeliveryCityID = ci.CityID
        inner join dbo.StateProvinces spv on ci.StateProvinceID = spv.StateProvinceID
        inner join dbo.Countries co on spv.CountryID = co.CountryID
        inner join dbo.Cities ci2 on sp.PostalCityID = ci2.CityID
        inner join dbo.StateProvinces spv2 on ci2.StateProvinceID = spv2.StateProvinceID
        inner join dbo.Countries co2 on spv2.CountryID = co2.CountryID
        where sp.SupplierID = @SupplierID
    end
go

/*
    Devuelve los años distintos en los que se registraron órdenes de compra.
    Devuelve: Año
*/
create or alter procedure Purchasing.GetPurchaseYears
as
	begin
		set nocount on
		select distinct year(OrderDate) as Año
		from dbo.PurchaseOrders
		order by Año
	end
go

/*
   Inserta un nuevo proveedor en la tabla Suppliers. Recibe todos los datos obligatorios
   y opcionales del proveedor, maneja valores por defecto (fax, web, ubicación geográfica),
   valida que @LastEditedBy corresponda a un empleado existente, y devuelve el SupplierID
   generado a través del parámetro de salida @NewSupplierID.
   La ciudad y el código postal de entrega también se guardan en la dirección postal.
*/
create or alter procedure Purchasing.InsertSupplier
    @SupplierName nvarchar(100),
    @SupplierCategoryID int,
    @LastEditedBy int,
    @SupplierReference nvarchar(20) = null,
    @PrimaryContactPersonID int,
    @AlternateContactPersonID int,
    @DeliveryMethodID int,
    @PaymentDays int,
    @PhoneNumber nvarchar(20),
    @FaxNumber nvarchar(20) = null,
    @WebsiteURL nvarchar(256) = null,
    @BankAccountName nvarchar(50) = null,
    @BankAccountBranch nvarchar(50) = null,
    @BankAccountCode nvarchar(20) = null,
    @BankAccountNumber nvarchar(20) = null,
    @BankInternationalCode nvarchar(20) = null,
    @DeliveryAddressLine1 nvarchar(60),
    @DeliveryAddressLine2 nvarchar(60) = null,
    @DeliveryCityID int,
    @DeliveryPostalCode nvarchar(10),
    @PostalAddressLine1 nvarchar(60),
    @PostalAddressLine2 nvarchar(60) = null,
    @InternalComments nvarchar(max) = null,
    @Latitude float = null,
    @Longitude float = null,
    @NewSupplierID int output
as
    begin
        set nocount on
        begin try
            if not exists (
                select 1 from dbo.People
                where PersonID = @LastEditedBy and IsEmployee = 1
            )
                throw 52003, 'El LastEditedBy indicado no corresponde a un empleado válido.', 1

            begin transaction
                declare @InsertedIDs table (SupplierID int)

                insert into dbo.Suppliers (
                    SupplierName, SupplierCategoryID, SupplierReference,
                    PrimaryContactPersonID, AlternateContactPersonID, DeliveryMethodID,
                    PaymentDays, PhoneNumber, FaxNumber, WebsiteURL,
                    BankAccountName, BankAccountBranch, BankAccountCode,
                    BankAccountNumber, BankInternationalCode,
                    DeliveryAddressLine1, DeliveryAddressLine2, DeliveryCityID, DeliveryPostalCode,
                    PostalAddressLine1, PostalAddressLine2, PostalCityID, PostalPostalCode,
                    InternalComments, DeliveryLocation, LastEditedBy
                )
                output inserted.SupplierID into @InsertedIDs
                values (
                    @SupplierName, @SupplierCategoryID, @SupplierReference,
                    @PrimaryContactPersonID, @AlternateContactPersonID, @DeliveryMethodID,
                    @PaymentDays, @PhoneNumber, coalesce(@FaxNumber,N''), coalesce(@WebsiteURL,N''),
                    @BankAccountName, @BankAccountBranch, @BankAccountCode,
                    @BankAccountNumber, @BankInternationalCode,
                    @DeliveryAddressLine1, @DeliveryAddressLine2, @DeliveryCityID, @DeliveryPostalCode,
                    @PostalAddressLine1, @PostalAddressLine2, @DeliveryCityID, @DeliveryPostalCode,
                    @InternalComments,
                    case when @Latitude is not null and @Longitude is not null
                         then geography::Point(@Latitude, @Longitude, 4326)
                         else null end, @LastEditedBy
                )

                select @NewSupplierID = SupplierID from @InsertedIDs
            commit transaction
            print 'Proveedor insertado correctamente. Nuevo SupplierID = ' + cast(@NewSupplierID as varchar(20)) + ' (' + @SupplierName + ')';
        end try
        begin catch
            if @@trancount > 0
                rollback transaction;
            ;throw;
        end catch
    end
go

/*
   Actualiza la información de un proveedor existente. Recibe el @SupplierID y todos los
   campos editables. Valida que @LastEditedBy corresponda a un empleado existente antes de
   aplicar cualquier cambio. Si el proveedor no existe, lanza un error personalizado (52000).
   La columna DeliveryLocation solo se actualiza si se envían latitud y longitud; de lo
   contrario, conserva el valor previo. La ciudad y el código postal de entrega tambien actualizan los valores postales
*/
create or alter procedure Purchasing.UpdateSupplier
    @SupplierID int,
    @SupplierName nvarchar(100),
    @SupplierCategoryID int,
    @LastEditedBy int,
    @SupplierReference nvarchar(20) = null,
    @PrimaryContactPersonID int,
    @AlternateContactPersonID int,
    @DeliveryMethodID int,
    @PaymentDays int,
    @PhoneNumber nvarchar(20),
    @FaxNumber nvarchar(20) = null,
    @WebsiteURL nvarchar(256) = null,
    @BankAccountName nvarchar(50) = null,
    @BankAccountBranch nvarchar(50) = null,
    @BankAccountCode nvarchar(20) = null,
    @BankAccountNumber nvarchar(20) = null,
    @BankInternationalCode nvarchar(20) = null,
    @DeliveryAddressLine1 nvarchar(60),
    @DeliveryAddressLine2 nvarchar(60) = null,
    @DeliveryCityID int,
    @DeliveryPostalCode nvarchar(10),
    @PostalAddressLine1 nvarchar(60),
    @PostalAddressLine2 nvarchar(60) = null,
    @InternalComments nvarchar(max) = null,
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
                throw 52003, 'El LastEditedBy indicado no corresponde a un empleado válido.', 1

            begin transaction
                update dbo.Suppliers
                set
                    SupplierName = @SupplierName,
                    LastEditedBy = @LastEditedBy,
                    SupplierCategoryID = @SupplierCategoryID,
                    SupplierReference = @SupplierReference,
                    PrimaryContactPersonID = @PrimaryContactPersonID,
                    AlternateContactPersonID = @AlternateContactPersonID,
                    DeliveryMethodID = @DeliveryMethodID,
                    PaymentDays = @PaymentDays,
                    PhoneNumber = @PhoneNumber,
                    FaxNumber = coalesce(@FaxNumber,N''),
                    WebsiteURL = coalesce(@WebsiteURL,N''),
                    BankAccountName = @BankAccountName,
                    BankAccountBranch = @BankAccountBranch,
                    BankAccountCode = @BankAccountCode,
                    BankAccountNumber = @BankAccountNumber,
                    BankInternationalCode = @BankInternationalCode,
                    DeliveryAddressLine1 = @DeliveryAddressLine1,
                    DeliveryAddressLine2 = @DeliveryAddressLine2,
                    DeliveryCityID = @DeliveryCityID,
                    DeliveryPostalCode = @DeliveryPostalCode,
                    PostalAddressLine1 = @PostalAddressLine1,
                    PostalAddressLine2 = @PostalAddressLine2,
                    PostalCityID = @DeliveryCityID,
                    PostalPostalCode = @DeliveryPostalCode,
                    InternalComments = @InternalComments,
                    DeliveryLocation = case when @Latitude is not null and @Longitude is not null
                                             then geography::Point(@Latitude, @Longitude, 4326)
                                             else DeliveryLocation end
                where SupplierID = @SupplierID

                if @@rowcount = 0
                    throw 52000, 'El proveedor indicado no existe.', 1
            commit transaction
            print 'Proveedor actualizado correctamente. SupplierID = ' + cast(@SupplierID as varchar(20)) + ' (' + @SupplierName + ')';
        end try
        begin catch
            if @@trancount > 0
                rollback transaction;
            ;throw;
        end catch
    end
go

/*
   Elimina un proveedor por su SupplierID. Solo permite la eliminación si el proveedor
   no tiene productos, órdenes de compra ni otros registros relacionados (FK). Si no
   existe, lanza error 52001; si hay violación de integridad referencial (error 547),
   lanza error 52002 con un mensaje más claro.
*/
create or alter procedure Purchasing.DeleteSupplier
    @SupplierID int
as
    begin
        set nocount on
        begin try
            begin transaction
                delete from dbo.Suppliers
                where SupplierID = @SupplierID

                if @@rowcount = 0
                    throw 52001, 'El proveedor indicado no existe.', 1
            commit transaction
            print 'Proveedor eliminado correctamente. SupplierID = ' + cast(@SupplierID as varchar(20));
        end try
        begin catch
            if @@trancount > 0
                rollback transaction
            if error_number() = 547
                throw 52002, 'No se puede eliminar el proveedor porque tiene productos, órdenes de compra u otros registros asociados.', 1
            else
                throw
        end catch
    end
go
