'use client'

import type { Dispatch, ReactNode, SetStateAction, SubmitEvent } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, RotateCcwIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { PaginatedResponse } from '@/lib/types/paginatedResponse'

const PAGE_SIZE = 10

const amountFormatter = new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const countFormatter = new Intl.NumberFormat('es-CR')

export const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

/** Columna del reporte, con el formato de sus valores y su título para la vista móvil. */
export interface ReportColumn<Row> {
  key: keyof Row
  label: string
  format?: 'amount' | 'count' | 'year' | 'month'
  primary?: boolean
}

interface ReportViewProps<Row, Filters> {
  title: string
  description: string
  columns: ReportColumn<Row>[]
  initialFilters: Filters
  loadData: (filters: Filters, pageNumber: number, pageSize: number) => Promise<Row[] | PaginatedResponse<Row>>
  renderFilters?: (filters: Filters, setFilters: Dispatch<SetStateAction<Filters>>) => ReactNode
  paginated?: boolean
  isSummary?: (row: Row) => boolean
}

function formatValue<Row>(row: Row, column: ReportColumn<Row>): string {
  const value = row[column.key]
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return ' '
  if (column.format === 'amount' && typeof value === 'number') return `$${amountFormatter.format(value)}`
  if (column.format === 'count' && typeof value === 'number') return countFormatter.format(value)
  if (column.format === 'month' && typeof value === 'number') return months[value - 1] ?? String(value)
  return String(value)
}

function getColumnWidth<Row>(column: ReportColumn<Row>): number {
  if (column.format === 'year') return 64
  if (column.format === 'count' || column.format === 'month') return 96
  if (column.format === 'amount') return 112
  return column.primary ? 192 : 144
}

/** Presentación compartida de los reportes siguiendo el formato de los listados actuales. */
export function ReportView<Row, Filters>({ title, description, columns, initialFilters, loadData, renderFilters, paginated = false, isSummary }: ReportViewProps<Row, Filters>) {
  const [draftFilters, setDraftFilters] = useState(initialFilters)
  const [filters, setFilters] = useState(initialFilters)
  const [pageNumber, setPageNumber] = useState(1)
  const [reportResponse, setReportResponse] = useState<PaginatedResponse<Row> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadReport() {
      setIsLoading(true)
      setError(null)
      try {
        const result = await loadData(filters, pageNumber, PAGE_SIZE)
        if (!cancelled) {
          setReportResponse(Array.isArray(result) ? {
            page: 1,
            size: result.length,
            totalCount: result.length,
            totalPages: result.length > 0 ? 1 : 0,
            data: result,
          } : result)
        }
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : 'No fue posible obtener el reporte')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadReport()
    return () => { cancelled = true }
  }, [filters, pageNumber, loadData, refreshKey])

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilters(draftFilters)
    setPageNumber(1)
    setRefreshKey((key) => key + 1)
  }

  function resetFilters() {
    setDraftFilters(initialFilters)
    setFilters(initialFilters)
    setPageNumber(1)
    setRefreshKey((key) => key + 1)
  }

  function handlePageSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const page = Number(new FormData(event.currentTarget).get('pageNumber'))
    if (!isLoading && !error && Number.isInteger(page) && page >= 1 && page <= totalPages) {
      setPageNumber(page)
    }
  }

  const rows = reportResponse?.data ?? []
  const totalPages = reportResponse?.totalPages ?? 0
  const totalCount = reportResponse?.totalCount ?? 0
  const primaryColumn = columns.find((column) => column.primary) ?? columns[0]
  const mobileColumns = columns.filter((column) => column !== primaryColumn)
  const tableMinWidth = columns.reduce((width, column) => width + getColumnWidth(column), 0)

  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-8 sm:py-8">
        <Link href="/reports" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Volver a estadísticas
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="break-words text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        {renderFilters && (
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <form className="grid gap-4 sm:grid-cols-2 sm:items-end lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={handleSubmit}>
              {renderFilters(draftFilters, setDraftFilters)}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isLoading}>
                  <SearchIcon data-icon="inline-start" />
                  Buscar
                </Button>
                <Button type="button" variant="outline" disabled={isLoading} onClick={resetFilters}>
                  <RotateCcwIcon data-icon="inline-start" />
                  Limpiar
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <h2 className="font-medium">Resultados del reporte</h2>
            <span className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
              {isLoading
                ? rows.length > 0 ? 'Actualizando...' : 'Cargando...'
                : error ? 'No disponible'
                  : paginated && totalPages > 0 ? `Página ${pageNumber} de ${totalPages}` : `${totalCount} ${totalCount === 1 ? 'registro' : 'registros'}`}
            </span>
          </div>

          <div className="min-h-[20rem] md:min-h-[26rem]" aria-busy={isLoading}>
            {isLoading && rows.length === 0 && (
              <p className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                Cargando reporte...
              </p>
            )}

            {!isLoading && error && (
              <div className="flex min-h-32 flex-col items-center justify-center gap-3 px-4 py-6">
                <p className="text-center text-sm text-destructive" role="alert">{error}</p>
                <Button type="button" variant="outline" onClick={() => setRefreshKey((key) => key + 1)}>
                  <RotateCcwIcon data-icon="inline-start" />
                  Reintentar
                </Button>
              </div>
            )}

            {!isLoading && !error && rows.length === 0 && (
              <p className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                No se encontraron resultados{renderFilters ? ' con los filtros seleccionados' : ''}.
              </p>
            )}

            {!error && rows.length > 0 && (
              <>
                <ul className="divide-y md:hidden">
                  {rows.map((row, index) => (
                    <li key={`${pageNumber}-${index}`} className={`space-y-3 px-4 py-4 text-sm${isSummary?.(row) ? ' bg-muted/50 font-medium' : ''}`}>
                      <p className="break-words font-medium">
                        {primaryColumn.format === 'year' ? 'Año ' : ''}{formatValue(row, primaryColumn)}
                      </p>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                        {mobileColumns.map((column) => (
                          <div key={String(column.key)} className="min-w-0">
                            <dt className="text-xs text-muted-foreground">{column.label}</dt>
                            <dd className={`break-words${column.format === 'amount' || column.format === 'count' ? ' tabular-nums' : ''}`}>{formatValue(row, column)}</dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  ))}
                </ul>

                <div className="hidden md:block">
                  <Table aria-label={title} className="table-fixed" style={{ minWidth: tableMinWidth }}>
                    <colgroup>
                      {columns.map((column) => (
                        <col key={String(column.key)} style={{ width: getColumnWidth(column) }} />
                      ))}
                    </colgroup>
                    <TableHeader>
                      <TableRow>
                        {columns.map((column) => (
                          <TableHead key={String(column.key)} scope="col" className={`whitespace-normal break-words py-2 leading-tight${column.format === 'amount' || column.format === 'count' ? ' text-right' : ''}`}>{column.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, index) => (
                        <TableRow key={`${pageNumber}-${index}`} className={isSummary?.(row) ? 'bg-muted/50 font-medium' : undefined}>
                          {columns.map((column) => (
                            <TableCell
                              key={String(column.key)}
                              className={column.format === 'amount' || column.format === 'count' ? 'text-right tabular-nums' : 'truncate'}
                              title={formatValue(row, column)}
                            >
                              {formatValue(row, column)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 border-t px-4 py-3 sm:flex-row sm:justify-between">
            <p className="text-center text-sm text-muted-foreground sm:text-left">
              {error ? 'No fue posible cargar los resultados.' : `Mostrando ${rows.length} de ${totalCount} registros`}
            </p>
            {paginated && (
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <div className="flex justify-center gap-2">
                  <Button type="button" variant="outline" disabled={pageNumber === 1 || isLoading || !!error || totalPages === 0} onClick={() => setPageNumber(pageNumber - 1)}>
                    <ChevronLeftIcon data-icon="inline-start" />
                    Anterior
                  </Button>
                  <Button type="button" variant="outline" disabled={pageNumber >= totalPages || isLoading || !!error} onClick={() => setPageNumber(pageNumber + 1)}>
                    Siguiente
                    <ChevronRightIcon data-icon="inline-end" />
                  </Button>
                </div>
                <form className="flex items-center justify-center gap-2" onSubmit={handlePageSubmit}>
                  <Label htmlFor="reportPageNumber" className="sr-only">Número de página</Label>
                  <Input
                    key={pageNumber}
                    id="reportPageNumber"
                    name="pageNumber"
                    type="number"
                    min={1}
                    max={totalPages}
                    step={1}
                    required
                    defaultValue={pageNumber}
                    disabled={isLoading || !!error || totalPages === 0}
                    onKeyDown={(event) => { if (event.key === '-') event.preventDefault() }}
                    onChange={(event) => {
                      if (event.currentTarget.value !== '' && Number(event.currentTarget.value) < 1) {
                        event.currentTarget.value = '1'
                      }
                    }}
                    className="w-16 text-center"
                  />
                  <Button type="submit" variant="outline" disabled={isLoading || !!error || totalPages === 0}>Ir</Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
