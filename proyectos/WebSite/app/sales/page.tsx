'use client'

import type { SubmitEvent } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarIcon, HashIcon, ReceiptTextIcon, TruckIcon } from 'lucide-react'
import { EmptyState, ErrorState, FilterCard, FilterSelect, HEAD_CLASS, ListCard, ListPagination, NewButton, PageHeader, ReadErrorsBanner, RowActions, RowMenu, SearchField, TableSkeleton } from '@/components/list-kit'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getDeliveryMethods } from '@/app/api/application'
import { getInvoices } from '@/app/api/sales'
import { useSession } from '@/components/auth-session'
import type { DeliveryMethod } from '@/lib/types/deliveryMethods'
import type { InvoiceFilters, InvoicesResponse } from '@/lib/types/sales'

const PAGE_SIZE = 10

const initialFilters: InvoiceFilters = {
  invoiceID: null,
  invoiceDateFrom: '',
  invoiceDateTo: '',
  customerName: '',
  deliveryMethodID: null,
  minInvoiceAmount: null,
  maxInvoiceAmount: null,
}

const dateFormatter = new Intl.DateTimeFormat('es-CR', { timeZone: 'UTC', dateStyle: 'medium' })
const amountFormatter = new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Oculta detalles internos de transporte y conserva los mensajes de negocio. */
function salesError(reason: unknown): string {
  const status = reason instanceof Error ? reason.cause : null
  if (status === 403) return 'Sin permisos para consultar ventas.'
  if (reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503)) return 'No fue posible cargar las facturas. Intente nuevamente.'
  return reason instanceof Error ? reason.message : 'No fue posible obtener las facturas.'
}

export default function SalesPage() {
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const [invoiceID, setInvoiceID] = useState<InvoiceFilters['invoiceID']>(null)
  const [invoiceDateFrom, setInvoiceDateFrom] = useState('')
  const [invoiceDateTo, setInvoiceDateTo] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [deliveryMethodID, setDeliveryMethodID] = useState<InvoiceFilters['deliveryMethodID']>(null)
  const [minInvoiceAmount, setMinInvoiceAmount] = useState<InvoiceFilters['minInvoiceAmount']>(null)
  const [maxInvoiceAmount, setMaxInvoiceAmount] = useState<InvoiceFilters['maxInvoiceAmount']>(null)
  const [filters, setFilters] = useState<InvoiceFilters>(initialFilters)
  const [pageNumber, setPageNumber] = useState(1)
  const [invoicesResponse, setInvoicesResponse] = useState<InvoicesResponse | null>(null)
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [methodsError, setMethodsError] = useState<string | null>(null)
  const [methodsLoading, setMethodsLoading] = useState(true)
  const [methodsRefresh, setMethodsRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision

    async function loadData() {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setIsLoading(true)
      setError(null)
      try {
        const invoicesData = await getInvoices(filters, pageNumber, PAGE_SIZE)
        if (!cancelled && isSessionCurrent(requestRevision)) setInvoicesResponse(invoicesData)
      } catch (reason) {
        if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); return }
        if (!cancelled && isSessionCurrent(requestRevision)) { setInvoicesResponse(null); setError(salesError(reason)) }
      } finally {
        if (!cancelled && isSessionCurrent(requestRevision)) setIsLoading(false)
      }
    }

    queueMicrotask(() => { void loadData() })
    return () => { cancelled = true }
  }, [filters, pageNumber, refreshKey, revision, isSessionCurrent, invalidateSession])

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision
    queueMicrotask(async () => {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setMethodsLoading(true)
      setMethodsError(null)
      try {
        const result = await getDeliveryMethods()
        if (!cancelled && isSessionCurrent(requestRevision)) setDeliveryMethods(result)
      } catch (reason) {
        if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); return }
        if (!cancelled && isSessionCurrent(requestRevision)) { setDeliveryMethods([]); setMethodsError(salesError(reason)) }
      } finally {
        if (!cancelled && isSessionCurrent(requestRevision)) setMethodsLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [methodsRefresh, revision, isSessionCurrent, invalidateSession])

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilters({ invoiceID, invoiceDateFrom, invoiceDateTo, customerName, deliveryMethodID, minInvoiceAmount, maxInvoiceAmount })
    setPageNumber(1)
  }

  function resetFilters() {
    setInvoiceID(null)
    setInvoiceDateFrom('')
    setInvoiceDateTo('')
    setCustomerName('')
    setDeliveryMethodID(null)
    setMinInvoiceAmount(null)
    setMaxInvoiceAmount(null)
    setFilters(initialFilters)
    setPageNumber(1)
  }

  const invoices = invoicesResponse?.data ?? []
  const totalPages = invoicesResponse?.totalPages ?? 0
  const totalCount = invoicesResponse?.totalCount ?? 0

  function changePage(page: number) {
    setPageNumber(page)
  }

  function handlePageSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const page = Number(new FormData(event.currentTarget).get('pageNumber'))
    if (!isLoading && !error && Number.isInteger(page) && page >= 1 && page <= totalPages) {
      changePage(page)
    }
  }

  const activeFilters = [filters.invoiceID !== null, filters.customerName.trim() !== '', filters.invoiceDateFrom !== '', filters.invoiceDateTo !== '', filters.deliveryMethodID !== null, filters.minInvoiceAmount !== null, filters.maxInvoiceAmount !== null].filter(Boolean).length
  const retryReads = () => { setRefreshKey(key => key + 1); setMethodsRefresh(key => key + 1) }
  const pageTotal = invoices.reduce((sum, invoice) => sum + invoice.MontoFacturado, 0)

  return (
    <main className="flex min-w-0 flex-1 bg-muted/40">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-24 sm:px-8 sm:pt-8 lg:pb-8">
        <PageHeader icon={ReceiptTextIcon} title="Ventas" subtitle={`${totalCount} ${totalCount === 1 ? 'factura' : 'facturas'}${activeFilters > 0 ? ' con los filtros aplicados' : ' registradas'}`}
          action={<NewButton href="/sales/new" label="Nueva factura" />} />

        <ReadErrorsBanner messages={methodsError ? [`Métodos de entrega: ${methodsError}`] : []} onRetry={retryReads} disabled={isLoading || methodsLoading} />

        <FilterCard activeFilters={activeFilters} onSubmit={handleSubmit} onReset={resetFilters} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="invoiceID">Número de factura</Label>
            <div className="relative">
              <HashIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="invoiceID" type="number" min={1} step={1} placeholder="Número de factura" value={invoiceID ?? ''} onChange={(event) => setInvoiceID(event.target.value ? Number(event.target.value) : null)} className="pl-8" />
            </div>
          </div>
          <SearchField id="customerName" label="Nombre del cliente" placeholder="Buscar por cliente" value={customerName} onChange={setCustomerName} />
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="invoiceDateFrom">Fecha desde</Label>
            <Input id="invoiceDateFrom" type="date" max={invoiceDateTo || undefined} value={invoiceDateFrom} onChange={(event) => setInvoiceDateFrom(event.target.value)} />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="invoiceDateTo">Fecha hasta</Label>
            <Input id="invoiceDateTo" type="date" min={invoiceDateFrom || undefined} value={invoiceDateTo} onChange={(event) => setInvoiceDateTo(event.target.value)} />
          </div>
          <FilterSelect id="deliveryMethod" label="Método de entrega" allLabel="Todos los métodos" value={deliveryMethodID} onChange={setDeliveryMethodID} disabled={methodsLoading || Boolean(methodsError)}
            options={deliveryMethods.map(method => ({ value: method.DeliveryMethodID, label: method.NombreMetodoEntrega }))} />
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="minInvoiceAmount">Monto mínimo</Label>
            <Input id="minInvoiceAmount" type="number" min={0} max={maxInvoiceAmount ?? undefined} step="0.01" placeholder="0.00" value={minInvoiceAmount ?? ''}
              onKeyDown={(event) => { if (event.key === '-') event.preventDefault() }}
              onChange={(event) => setMinInvoiceAmount(event.target.value ? Math.max(0, Number(event.target.value)) : null)} />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="maxInvoiceAmount">Monto máximo</Label>
            <Input id="maxInvoiceAmount" type="number" min={minInvoiceAmount ?? 0} step="0.01" placeholder="Sin límite" value={maxInvoiceAmount ?? ''}
              onKeyDown={(event) => { if (event.key === '-') event.preventDefault() }}
              onChange={(event) => setMaxInvoiceAmount(event.target.value ? Math.max(0, Number(event.target.value)) : null)} />
          </div>
        </FilterCard>

        <ListCard title="Listado de facturas" loadingMore={isLoading && invoices.length > 0} pageNumber={pageNumber} totalPages={totalPages}>
          <div className="min-h-[20rem] md:min-h-[30rem]" aria-busy={isLoading}>
            {isLoading && invoices.length === 0 && <TableSkeleton label="Cargando facturas..." avatar={false} />}
            {!isLoading && error && <ErrorState message={error} onRetry={retryReads} disabled={isLoading || methodsLoading} />}
            {!isLoading && !error && invoices.length === 0 && <EmptyState message="No se encontraron facturas con los filtros seleccionados." onReset={activeFilters > 0 ? resetFilters : undefined} />}

            {!error && invoices.length > 0 && (
              <>
                <ul className="divide-y md:hidden">
                  {invoices.map((invoice) => (
                    <li key={invoice.NumeroFactura} className="flex gap-3 px-4 py-4">
                      <InvoiceIcon />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                          <Link href={`/sales/${invoice.NumeroFactura}`} className="font-medium tabular-nums hover:underline">Factura #{invoice.NumeroFactura}</Link>
                          <span className="font-semibold tabular-nums">${amountFormatter.format(invoice.MontoFacturado)}</span>
                        </div>
                        <p className="break-words text-sm">{invoice.NombreCliente}</p>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><CalendarIcon className="size-3" aria-hidden="true" />{dateFormatter.format(new Date(invoice.FechaFactura))}</span>
                          <Badge variant="outline"><TruckIcon aria-hidden="true" />{invoice.NombreMetodoEntrega}</Badge>
                        </div>
                      </div>
                      <RowMenu detailHref={`/sales/${invoice.NumeroFactura}`} editHref={`/sales/${invoice.NumeroFactura}/edit`} name={`la factura ${invoice.NumeroFactura}`} />
                    </li>
                  ))}
                </ul>

                <div className="hidden md:block">
                  <Table className="min-w-[860px] table-fixed">
                    <colgroup><col className="w-36" /><col className="w-36" /><col /><col className="w-[20%]" /><col className="w-40" /><col className="w-44" /></colgroup>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={HEAD_CLASS}>Factura</TableHead>
                        <TableHead className={HEAD_CLASS}>Fecha</TableHead>
                        <TableHead className={HEAD_CLASS}>Cliente</TableHead>
                        <TableHead className={HEAD_CLASS}>Método de entrega</TableHead>
                        <TableHead className={`text-right ${HEAD_CLASS}`}>Monto facturado</TableHead>
                        <TableHead className={`text-right ${HEAD_CLASS}`}>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.NumeroFactura}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <InvoiceIcon />
                              <Link href={`/sales/${invoice.NumeroFactura}`} className="font-medium tabular-nums hover:underline">#{invoice.NumeroFactura}</Link>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground tabular-nums">{dateFormatter.format(new Date(invoice.FechaFactura))}</TableCell>
                          <TableCell className="truncate font-medium" title={invoice.NombreCliente}>{invoice.NombreCliente}</TableCell>
                          <TableCell><Badge variant="outline" className="max-w-full" title={invoice.NombreMetodoEntrega}><TruckIcon aria-hidden="true" /><span className="truncate">{invoice.NombreMetodoEntrega}</span></Badge></TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">${amountFormatter.format(invoice.MontoFacturado)}</TableCell>
                          <TableCell><RowActions detailHref={`/sales/${invoice.NumeroFactura}`} editHref={`/sales/${invoice.NumeroFactura}/edit`} name={`la factura ${invoice.NumeroFactura}`} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter className="bg-muted/30">
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="text-right text-xs font-medium text-muted-foreground uppercase">Total de esta página</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">${amountFormatter.format(pageTotal)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </>
            )}
          </div>

          <ListPagination inputId="salesPageNumber" noun="facturas" pageNumber={pageNumber} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} shown={invoices.length} disabled={isLoading || Boolean(error)} onChange={changePage} onSubmit={handlePageSubmit} />
        </ListCard>
      </section>
    </main>
  )
}

function InvoiceIcon() {
  return <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/10"><ReceiptTextIcon className="size-4" /></span>
}
