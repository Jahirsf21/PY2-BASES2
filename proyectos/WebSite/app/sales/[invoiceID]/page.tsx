'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getInvoiceByID, getInvoiceLinesByID } from '@/app/api/sales'
import { parseEntityId } from '@/lib/helpers/entityValidation'
import type { InvoiceDetail } from '@/lib/types/sales'

const amountFormatter = new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat('es-CR', { timeZone: 'UTC', dateStyle: 'medium' })

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return <div><dt className="text-sm text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value ?? 'No disponible'}</dd></div>
}

export default function InvoiceDetailPage() {
  const { invoiceID } = useParams<{ invoiceID: string }>()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const id = parseEntityId(invoiceID)
    if (id === null) {
      Promise.resolve().then(() => { if (!cancelled) setError('Factura no encontrada') })
    } else {
      Promise.all([getInvoiceByID(id), getInvoiceLinesByID(id)]).then(([headers, lines]) => {
        if (!headers[0]) throw new Error('Factura no encontrada')
        if (!cancelled) setInvoice({header: headers[0], lines})
      })
        .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'No fue posible obtener la factura') })
    }
    return () => { cancelled = true }
  }, [invoiceID])

  const header = invoice?.header
  const total = invoice?.lines.reduce((sum, line) => sum + line.TotalLinea, 0) ?? 0

  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <Link href="/sales" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Volver a ventas
        </Link>

        {!error && !invoice && <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Cargando factura...</p>}
        {error && <p role="alert" className="rounded-lg border bg-card p-6 text-sm text-destructive">{error}</p>}

        {invoice && header && !error && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Factura #{header.NumeroFactura}</p>
                <h1 className="break-words text-2xl font-semibold tracking-tight">{header.NombreCliente}</h1>
              </div>
              <Button nativeButton={false} render={<Link href={`/sales/${header.NumeroFactura}/edit`} />} variant="outline">Editar factura</Button>
            </div>

            <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="general-title">
              <h2 id="general-title" className="mb-4 text-lg font-semibold">Datos generales</h2>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField label="Fecha de factura" value={dateFormatter.format(new Date(header.FechaFactura))} />
                <DetailField label="Cliente" value={header.NombreCliente} />
                <DetailField label="Número de orden" value={header.NumeroOrden} />
                <DetailField label="Método de entrega" value={header.NombreMetodoEntrega} />
                <DetailField label="Contacto" value={header.NombreContacto} />
                <DetailField label="Vendedor" value={header.NombreVendedor} />
              </dl>
            </section>

            <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="delivery-title">
              <h2 id="delivery-title" className="mb-4 text-lg font-semibold">Entrega</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Instrucciones de entrega" value={header.InstruccionesEntrega} />
              </dl>
            </section>

            <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="lines-title">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 id="lines-title" className="text-lg font-semibold">Productos facturados</h2>
                <p className="text-sm text-muted-foreground">{invoice.lines.length} {invoice.lines.length === 1 ? 'línea' : 'líneas'}</p>
              </div>

              {invoice.lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Esta factura no tiene líneas de productos.</p>
              ) : (
                <>
                  <ul className="divide-y border-y md:hidden">
                    {invoice.lines.map((line, index) => (
                      <li key={`${line.StockItemID}-${index}`} className="space-y-3 py-4 text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="break-words font-medium">{line.NombreProducto}</p>
                          <p className="font-medium tabular-nums">${amountFormatter.format(line.TotalLinea)}</p>
                        </div>
                        <dl className="grid grid-cols-2 gap-3">
                          <DetailField label="Cantidad" value={line.Cantidad} />
                          <DetailField label="Precio unitario" value={`$${amountFormatter.format(line.PrecioUnitario)}`} />
                          <DetailField label="Impuesto aplicado" value={`${line.ImpuestoAplicado} %`} />
                          <DetailField label="Monto del impuesto" value={`$${amountFormatter.format(line.MontoImpuesto)}`} />
                        </dl>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden md:block">
                    <Table className="min-w-[720px] table-fixed">
                      <TableHeader><TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Precio unitario</TableHead>
                        <TableHead className="text-right">Impuesto</TableHead>
                        <TableHead className="text-right">Monto impuesto</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {invoice.lines.map((line, index) => (
                          <TableRow key={`${line.StockItemID}-${index}`}>
                            <TableCell className="break-words">{line.NombreProducto}</TableCell>
                            <TableCell className="text-right tabular-nums">{line.Cantidad}</TableCell>
                            <TableCell className="text-right tabular-nums">${amountFormatter.format(line.PrecioUnitario)}</TableCell>
                            <TableCell className="text-right tabular-nums">{line.ImpuestoAplicado} %</TableCell>
                            <TableCell className="text-right tabular-nums">${amountFormatter.format(line.MontoImpuesto)}</TableCell>
                            <TableCell className="text-right tabular-nums">${amountFormatter.format(line.TotalLinea)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
              <p className="mt-4 border-t pt-4 text-right font-semibold tabular-nums">Total facturado: ${amountFormatter.format(total)}</p>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
