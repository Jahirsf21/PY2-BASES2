use WideWorldImporters;
go
if db_name() <> N'WideWorldImporters' throw 50000, N'Base incorrecta', 1;
go

-- ======================================================================================
-- APPLICATION
-- ======================================================================================

/*
    Obtiene todos los métodos de entrega ordenados por su identificador.
    Devuelve: DeliveryMethodID, NombreMetodoEntrega
*/
create or alter procedure Application.GetDeliveryMethods
as
    begin
        set nocount on
        select
            DeliveryMethodID,
            DeliveryMethodName as NombreMetodoEntrega
        from dbo.DeliveryMethods
        order by DeliveryMethodID
    end
go

/*
    Obtiene personas de contacto paginadas (excluye empleados, vendedores y la persona 1),
    opcionalmente filtradas por nombre.
    Incluye el total de registros (TotalCount) para calcular la paginación en el cliente.
    Devuelve: PersonID, NombreCompleto
*/
create or alter procedure Application.GetPeople
    @FullName nvarchar(100) = null,
    @PageNumber int = 1,
    @PageSize int = 10,
    @TotalCount int = 0 output
as
    begin
        set nocount on
        select @TotalCount = count(*) from dbo.People
        where 
            (@FullName is null or FullName like '%' + @FullName + '%')
            and IsEmployee = 0 and IsSalesperson = 0 and PersonID != 1
        select
            PersonID,
            FullName as NombreCompleto
        from dbo.People
        where 
            (@FullName is null or FullName like '%' + @FullName + '%')
            and IsEmployee = 0
            and IsSalesperson = 0
            and PersonID != 1
        order by PersonID
        offset(@PageNumber - 1) * @PageSize rows
        fetch next @PageSize rows only
    end
go

/*
    Obtiene las personas registradas como empleados para los formularios, ordenadas por nombre e identificador.
    Devuelve: PersonID, NombreCompleto.
*/
create or alter procedure Application.GetEmployee
as 
    begin
        set nocount on
        select 
            PersonID,
            FullName as NombreCompleto
        from dbo.People
        where IsEmployee = 1
        order by FullName, PersonID
    end
go

/* Obtiene los vendedores disponibles para asignar a las facturas. */
create or alter procedure Application.GetSalespeople
as
begin
    set nocount on
    select PersonID, FullName as NombreCompleto
    from dbo.People
    where IsSalesperson = 1
    order by FullName, PersonID
end
go

/*
    Obtiene las ciudades paginadas, ordenadas por identificador.
    Permite filtrar opcionalmente por nombre de ciudad, provincia y país.
    Si un filtro es NULL, no se aplica.
    Incluye el total de registros (TotalCount) para calcular la paginación en el cliente.
    Devuelve: CityID, NombreCiudad, Provincia, NombrePais
*/
create or alter procedure Application.GetCities
    @CityName nvarchar(100) = null,
    @ProvinceName nvarchar(100) = null,
    @CountryName nvarchar(100) = null,
    @PageNumber int = 1,
    @PageSize int = 10,
    @TotalCount int = 0 output
as
    begin
        set nocount on
        select @TotalCount = count(*) from dbo.Cities ci
        inner join dbo.StateProvinces sp on ci.StateProvinceID = sp.StateProvinceID
        inner join dbo.Countries co on sp.CountryID = co.CountryID
        where
            (@CityName is null or ci.CityName like '%' + @CityName + '%')
            and (@ProvinceName is null or sp.StateProvinceName like '%' + @ProvinceName + '%')
            and (@CountryName   is null or co.CountryName like '%' + @CountryName + '%')
        select
            ci.CityID,
            ci.CityName as NombreCiudad,
            sp.StateProvinceName as Provincia,
            co.CountryName as NombrePais
        from dbo.Cities ci
        inner join dbo.StateProvinces sp on ci.StateProvinceID = sp.StateProvinceID
        inner join dbo.Countries co on sp.CountryID = co.CountryID
        where
            (@CityName is null or ci.CityName like '%' + @CityName + '%')
            and (@ProvinceName is null or sp.StateProvinceName like '%' + @ProvinceName + '%')
            and (@CountryName   is null or co.CountryName like '%' + @CountryName + '%')
        order by ci.CityID
        offset(@PageNumber - 1) * @PageSize rows
        fetch next @PageSize rows only
    end
go
