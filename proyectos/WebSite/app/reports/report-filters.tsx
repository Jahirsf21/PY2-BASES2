'use client'

import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { getStockGroups } from '@/app/api/stockItems'
import { getInvoiceYears, getPurchaseYears } from '@/app/api/stats'
import type { MonthlyTrackingFilters, ReportYearSource, YearFilters, YearRangeFilters } from '@/lib/types/stats'
import type { StockGroup } from '@/lib/types/stockItems'
import { months } from '@/app/reports/report-view'

interface SummaryReportFiltersProps {
  entity: 'customer' | 'supplier'
  name: string
  categoryName: string
  onNameChange: (value: string) => void
  onCategoryChange: (value: string) => void
}

/** Filtros de texto por nombre y categoría para los resúmenes de clientes y proveedores. */
export function SummaryReportFilters({ entity, name, categoryName, onNameChange, onCategoryChange }: SummaryReportFiltersProps) {
  const isCustomer = entity === 'customer'

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="reportName">Nombre del {isCustomer ? 'cliente' : 'proveedor'}</Label>
        <Input id="reportName" placeholder="Buscar por nombre" value={name} onChange={(event) => onNameChange(event.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="reportCategory">Categoría</Label>
        <Input id="reportCategory" placeholder="Buscar por categoría" value={categoryName} onChange={(event) => onCategoryChange(event.target.value)} />
      </div>
    </>
  )
}

/** Obtiene los años del procedimiento correspondiente, sin depender de los resultados del reporte. */
function useReportYears(source: ReportYearSource) {
  const [years, setYears] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadYears() {
      setIsLoading(true)
      setError(null)
      try {
        const result = source === 'invoices' ? await getInvoiceYears() : await getPurchaseYears()
        if (!cancelled) setYears(result.map((row) => row.Año))
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'No fue posible obtener los años disponibles'
          setError(message)
          toast.add({ type: 'error', title: 'No se pudieron cargar los años disponibles', description: message, priority: 'high', timeout: 8000 })
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadYears()
    return () => { cancelled = true }
  }, [source, refreshKey])

  return { years, isLoading, error, reload: () => setRefreshKey((key) => key + 1) }
}

interface ReportYearFilterProps {
  id: string
  label: string
  value: number | null
  years: number[]
  isLoading: boolean
  onChange: (value: number | null) => void
  minYear?: number | null
  maxYear?: number | null
  error?: string | null
  onRetry?: () => void
}

/** Selector de los años existentes, con la opción de consultar todos los años. */
function ReportYearFilter({ id, label, value, years, isLoading, onChange, minYear = null, maxYear = null, error, onRetry }: ReportYearFilterProps) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{label}</Label>
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          type="button"
          disabled={isLoading}
          aria-busy={isLoading}
          className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
        >
          <span className="min-w-0 truncate">{isLoading ? 'Cargando años...' : value ?? 'Todos los años'}</span>
          <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-w-[calc(100vw-2rem)]">
          <DropdownMenuRadioGroup value={value === null ? '' : String(value)} onValueChange={(selected) => onChange(selected === '' ? null : Number(selected))}>
            <DropdownMenuRadioItem value="" closeOnClick>Todos los años</DropdownMenuRadioItem>
            {years.map((year) => (
              <DropdownMenuRadioItem key={year} value={String(year)} disabled={(minYear !== null && year < minYear) || (maxYear !== null && year > maxYear)} closeOnClick>
                {year}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && onRetry && <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onRetry}>Reintentar años</Button>}
      {!isLoading && !error && years.length === 0 && <p className="text-sm text-muted-foreground">No hay años disponibles.</p>}
    </div>
  )
}

/** Filtro de un año opcional usando los años existentes para el reporte. */
export function YearReportFilters({ source, filters, setFilters }: { source: ReportYearSource; filters: YearFilters; setFilters: Dispatch<SetStateAction<YearFilters>> }) {
  const { years, isLoading, error, reload } = useReportYears(source)

  return (
    <div className="min-w-0 lg:col-span-2">
      <ReportYearFilter
        id="reportYear"
        label="Año"
        value={filters.year}
        years={years}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        onChange={(value) => setFilters((previous) => ({ ...previous, year: value }))}
      />
    </div>
  )
}

/** Filtros opcionales del ranking usando los años existentes y validando el rango. */
export function YearRangeReportFilters({ source, filters, setFilters }: { source: ReportYearSource; filters: YearRangeFilters; setFilters: Dispatch<SetStateAction<YearRangeFilters>> }) {
  const { years, isLoading, error, reload } = useReportYears(source)

  return (
    <>
      <ReportYearFilter
        id="reportYearFrom"
        label="Año desde"
        value={filters.yearFrom}
        years={years}
        isLoading={isLoading}
        maxYear={filters.yearTo}
        error={error}
        onRetry={reload}
        onChange={(value) => setFilters((previous) => ({ ...previous, yearFrom: value }))}
      />
      <ReportYearFilter
        id="reportYearTo"
        label="Año hasta"
        value={filters.yearTo}
        years={years}
        isLoading={isLoading}
        minYear={filters.yearFrom}
        onChange={(value) => setFilters((previous) => ({ ...previous, yearTo: value }))}
      />
    </>
  )
}

interface ReportStockGroupsFilterProps {
  stockGroupIDs: number[]
  stockGroups: StockGroup[]
  isLoading: boolean
  onToggle: (stockGroupID: number, checked: boolean) => void
  onClear: () => void
}

/** Selector de varias categorías de productos mediante casillas, sin límite de selección. */
function ReportStockGroupsFilter({ stockGroupIDs, stockGroups, isLoading, onToggle, onClear }: ReportStockGroupsFilterProps) {
  const selectionLabel = stockGroupIDs.length === 0
    ? 'Todas las categorías'
    : stockGroupIDs.length === 1
      ? stockGroups.find((group) => group.StockGroupID === stockGroupIDs[0])?.NombreGrupoProducto ?? '1 categoría seleccionada'
      : `${stockGroupIDs.length} categorías seleccionadas`

  return (
    <div className="grid min-w-0 gap-2 sm:col-span-2">
      <Label htmlFor="reportStockGroups">Categorías de productos</Label>
      <DropdownMenu>
        <DropdownMenuTrigger
          id="reportStockGroups"
          type="button"
          disabled={isLoading}
          aria-busy={isLoading}
          aria-describedby="reportStockGroupsHelp"
          className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
        >
          <span className="min-w-0 truncate">{isLoading ? 'Cargando categorías...' : selectionLabel}</span>
          <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-w-[calc(100vw-2rem)]">
          <DropdownMenuItem onClick={onClear} closeOnClick={false}>Quitar filtro de categorías</DropdownMenuItem>
          {stockGroups.map((group) => (
            <DropdownMenuCheckboxItem key={group.StockGroupID} checked={stockGroupIDs.includes(group.StockGroupID)} onCheckedChange={(checked) => onToggle(group.StockGroupID, checked)} closeOnClick={false}>{group.NombreGrupoProducto}</DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Filtros de año, mes y categorías de productos para el seguimiento mensual. */
export function MonthlyTrackingReportFilters({ source, filters, setFilters }: { source: ReportYearSource; filters: MonthlyTrackingFilters; setFilters: Dispatch<SetStateAction<MonthlyTrackingFilters>> }) {
  const { years, isLoading, error, reload } = useReportYears(source)
  const [stockGroups, setStockGroups] = useState<StockGroup[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [groupsRefreshKey, setGroupsRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadStockGroups() {
      setIsLoadingGroups(true)
      setGroupsError(null)
      try {
        const result = await getStockGroups()
        if (!cancelled) setStockGroups(result)
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'No fue posible obtener las categorías de productos'
          setGroupsError(message)
          toast.add({ type: 'error', title: 'No se pudieron cargar las categorías de productos', description: message, priority: 'high', timeout: 8000 })
        }
      } finally {
        if (!cancelled) setIsLoadingGroups(false)
      }
    }

    void loadStockGroups()
    return () => { cancelled = true }
  }, [groupsRefreshKey])

  return (
    <div className="grid min-w-0 gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-2">
      <ReportYearFilter
        id="reportYear"
        label="Año"
        value={filters.year}
        years={years}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        onChange={(value) => setFilters((previous) => ({ ...previous, year: value }))}
      />
      <div className="grid gap-2">
        <Label htmlFor="reportMonth">Mes</Label>
        <DropdownMenu>
          <DropdownMenuTrigger
            id="reportMonth"
            type="button"
            className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <span className="min-w-0 truncate">{filters.month === null ? 'Todos los meses' : months[filters.month - 1]}</span>
            <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-w-[calc(100vw-2rem)]">
            <DropdownMenuRadioGroup value={filters.month === null ? '' : String(filters.month)} onValueChange={(value) => setFilters((previous) => ({ ...previous, month: value === '' ? null : Number(value) }))}>
              <DropdownMenuRadioItem value="" closeOnClick>Todos los meses</DropdownMenuRadioItem>
              {months.map((month, index) => (
                <DropdownMenuRadioItem key={month} value={String(index + 1)} closeOnClick>{month}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ReportStockGroupsFilter
        stockGroupIDs={filters.stockGroupIDs}
        stockGroups={stockGroups}
        isLoading={isLoadingGroups}
        onToggle={(stockGroupID, checked) => setFilters((previous) => ({
          ...previous,
          stockGroupIDs: checked
            ? previous.stockGroupIDs.includes(stockGroupID) ? previous.stockGroupIDs : [...previous.stockGroupIDs, stockGroupID]
            : previous.stockGroupIDs.filter((id) => id !== stockGroupID),
        }))}
        onClear={() => setFilters((previous) => ({ ...previous, stockGroupIDs: [] }))}
      />
      <p id="reportStockGroupsHelp" className="text-xs text-muted-foreground sm:col-span-2">Los montos incluyen productos que pertenecen a todas las categorías seleccionadas. Sin selección, se incluyen todas las categorías.</p>
      {groupsError && (
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <Button type="button" variant="outline" size="sm" disabled={isLoadingGroups} onClick={() => setGroupsRefreshKey((key) => key + 1)}>Reintentar</Button>
        </div>
      )}
    </div>
  )
}
