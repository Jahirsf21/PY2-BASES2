'use client'

import type { SubmitEvent } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, RotateCcwIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getDeliveryMethods } from '@/app/api/application'
import { getInvoices } from '@/app/api/sales'
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

export default function SalesPage() {
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

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setIsLoading(true)
      setError(null)
      try {
        const invoicesData = await getInvoices(filters, pageNumber, PAGE_SIZE)
        if (!cancelled) setInvoicesResponse(invoicesData)
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : 'No fue posible obtener las facturas')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadData()
    return () => { cancelled = true }
  }, [filters, pageNumber])

  useEffect(() => {
    getDeliveryMethods().then(setDeliveryMethods).catch(() => {})
  }, [])

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

  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
            <p className="text-sm text-muted-foreground">{totalCount} {totalCount === 1 ? 'Factura' : 'Facturas'}</p>
          </div>
          <Button nativeButton={false} render={<Link href="/sales/new" />}>
            <PlusIcon data-icon="inline-start" /> Nueva factura
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="invoiceID">Número de factura</Label>
              <Input
                id="invoiceID"
                type="number"
                min={1}
                step={1}
                placeholder="Número de factura"
                value={invoiceID ?? ''}
                onChange={(event) => setInvoiceID(event.target.value ? Number(event.target.value) : null)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customerName">Nombre del cliente</Label>
              <Input
                id="customerName"
                placeholder="Buscar por cliente"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invoiceDateFrom">Fecha desde</Label>
              <Input
                id="invoiceDateFrom"
                type="date"
                max={invoiceDateTo || undefined}
                value={invoiceDateFrom}
                onChange={(event) => setInvoiceDateFrom(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invoiceDateTo">Fecha hasta</Label>
              <Input
                id="invoiceDateTo"
                type="date"
                min={invoiceDateFrom || undefined}
                value={invoiceDateTo}
                onChange={(event) => setInvoiceDateTo(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deliveryMethod">Método de entrega</Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  id="deliveryMethod"
                  type="button"
                  className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <span className="min-w-0 truncate">
                    {deliveryMethodID === null ? 'Todos los métodos' : deliveryMethods.find((method) => method.DeliveryMethodID === deliveryMethodID)?.NombreMetodoEntrega ?? 'Método seleccionado'}
                  </span>
                  <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-w-[calc(100vw-2rem)]">
                  <DropdownMenuRadioGroup
                    value={deliveryMethodID === null ? '' : String(deliveryMethodID)}
                    onValueChange={(value) => setDeliveryMethodID(value === '' ? null : Number(value))}
                  >
                    <DropdownMenuRadioItem value="" closeOnClick>Todos los métodos</DropdownMenuRadioItem>
                    {deliveryMethods.map((method) => (
                      <DropdownMenuRadioItem key={method.DeliveryMethodID} value={String(method.DeliveryMethodID)} closeOnClick>
                        {method.NombreMetodoEntrega}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="minInvoiceAmount">Monto mínimo</Label>
              <Input
                id="minInvoiceAmount"
                type="number"
                min={0}
                max={maxInvoiceAmount ?? undefined}
                step="0.01"
                placeholder="Monto mínimo"
                value={minInvoiceAmount ?? ''}
                onKeyDown={(event) => { if (event.key === '-') event.preventDefault() }}
                onChange={(event) => setMinInvoiceAmount(event.target.value ? Math.max(0, Number(event.target.value)) : null)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="maxInvoiceAmount">Monto máximo</Label>
              <Input
                id="maxInvoiceAmount"
                type="number"
                min={minInvoiceAmount ?? 0}
                step="0.01"
                placeholder="Monto máximo"
                value={maxInvoiceAmount ?? ''}
                onKeyDown={(event) => { if (event.key === '-') event.preventDefault() }}
                onChange={(event) => setMaxInvoiceAmount(event.target.value ? Math.max(0, Number(event.target.value)) : null)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit">
                <SearchIcon data-icon="inline-start" />
                Buscar
              </Button>
              <Button type="button" variant="outline" onClick={resetFilters}>
                <RotateCcwIcon data-icon="inline-start" />
                Limpiar
              </Button>
            </div>
          </form>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-medium">Listado de facturas</h2>
            <span className="text-sm text-muted-foreground">
              {isLoading && invoices.length > 0
                ? 'Actualizando...'
                : `Página ${pageNumber} de ${totalPages}`}
            </span>
          </div>

          <div className="min-h-[20rem] md:min-h-[26rem]" aria-busy={isLoading}>
            {isLoading && invoices.length === 0 && (
              <p className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                Cargando facturas...
              </p>
            )}

            {!isLoading && error && (
              <p className="flex h-32 items-center justify-center px-4 text-center text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            {!isLoading && !error && invoices.length === 0 && (
              <p className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                No se encontraron facturas con los filtros seleccionados.
              </p>
            )}

            {!error && invoices.length > 0 && (
              <>
                <ul className="divide-y md:hidden">
                  {invoices.map((invoice) => (
                    <li key={invoice.NumeroFactura} className="space-y-3 px-4 py-4 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 break-words font-medium">Factura #{invoice.NumeroFactura}</p>
                        <p className="font-medium tabular-nums">${amountFormatter.format(invoice.MontoFacturado)}</p>
                      </div>
                      <p className="break-words">{invoice.NombreCliente}</p>
                      <dl className="grid grid-cols-2 gap-x-4">
                        <div className="min-w-0">
                          <dt className="text-xs text-muted-foreground">Fecha</dt>
                          <dd>{dateFormatter.format(new Date(invoice.FechaFactura))}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-xs text-muted-foreground">Método de entrega</dt>
                          <dd className="break-words">{invoice.NombreMetodoEntrega}</dd>
                        </div>
                      </dl>
                      <div className="flex justify-end">
                        <Button nativeButton={false} render={<Link href={`/sales/${invoice.NumeroFactura}`} />} variant="outline" size="sm">Ver detalle</Button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="hidden md:block">
                  <Table className="min-w-[800px] table-fixed">
                    <colgroup>
                      <col className="w-[13%]" />
                      <col className="w-[15%]" />
                      <col className="w-[23%]" />
                      <col className="w-[19%]" />
                      <col className="w-[17%]" />
                      <col className="w-[13%]" />
                    </colgroup>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Factura</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Método de entrega</TableHead>
                        <TableHead className="text-right">Monto facturado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.NumeroFactura}>
                          <TableCell className="truncate font-medium">#{invoice.NumeroFactura}</TableCell>
                          <TableCell className="truncate">{dateFormatter.format(new Date(invoice.FechaFactura))}</TableCell>
                          <TableCell className="truncate" title={invoice.NombreCliente}>{invoice.NombreCliente}</TableCell>
                          <TableCell className="truncate" title={invoice.NombreMetodoEntrega}>{invoice.NombreMetodoEntrega}</TableCell>
                          <TableCell className="truncate text-right tabular-nums">${amountFormatter.format(invoice.MontoFacturado)}</TableCell>
                          <TableCell><Button nativeButton={false} render={<Link href={`/sales/${invoice.NumeroFactura}`} />} variant="outline" size="sm">Ver detalle</Button></TableCell>
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
              Mostrando {invoices.length} de {totalCount} Facturas
            </p>
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <div className="flex justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pageNumber === 1 || isLoading || !!error || totalPages === 0}
                  onClick={() => changePage(pageNumber - 1)}
                >
                  <ChevronLeftIcon data-icon="inline-start" />
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pageNumber >= totalPages || isLoading || !!error}
                  onClick={() => changePage(pageNumber + 1)}
                >
                  Siguiente
                  <ChevronRightIcon data-icon="inline-end" />
                </Button>
              </div>
              <form className="flex items-center justify-center gap-2" onSubmit={handlePageSubmit}>
                <Label htmlFor="salesPageNumber" className="sr-only">Número de página</Label>
                <Input
                  key={pageNumber}
                  id="salesPageNumber"
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
                <Button type="submit" variant="outline" disabled={isLoading || !!error || totalPages === 0}>
                  Ir
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
