'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { BadgeCheckIcon, CalendarIcon, DollarSignIcon, HashIcon, ListOrderedIcon, PackageIcon, PencilIcon, ReceiptTextIcon, TruckIcon, UserIcon } from 'lucide-react'
import { BackLink, DetailError, DetailHero, DetailItem, DetailSkeleton, SectionCard } from '@/components/detail-kit'
import { HEAD_CLASS } from '@/components/list-kit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSession } from '@/components/auth-session'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getInvoiceByID, getInvoiceLinesByID } from '@/app/api/sales'
import { parseEntityId } from '@/lib/helpers/entityValidation'
import { rowWithIdSchema } from '@/lib/schemas/responses'
import type { InvoiceDetail } from '@/lib/types/sales'

const amountFormatter = new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat('es-CR', { timeZone: 'UTC', dateStyle: 'long' })

export default function InvoiceDetailPage() {
  const { invoiceID } = useParams<{ invoiceID: string }>()
  return <InvoiceDetailContent key={invoiceID} invoiceID={invoiceID} />
}

/** Carga encabezado y líneas sin exponer respuestas de otra sesión o factura. */
function InvoiceDetailContent({ invoiceID }: { invoiceID: string }) {
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision
    /** Cada lectura maneja su 401 aunque Promise.all ya haya rechazado otra. */
    function failed(reason: unknown, resource: string): never {
      if (reason instanceof Error && reason.cause === 401) invalidateSession(requestRevision)
      else if (!cancelled && isSessionCurrent(requestRevision)) {
        const status = reason instanceof Error ? reason.cause : null
        setError(`${resource}: ${status === 403 ? 'Sin permisos.' : reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503) ? 'No fue posible cargar el recurso. Intente nuevamente.' : reason instanceof Error ? reason.message : 'No disponible.'}`)
      }
      throw reason
    }
    queueMicrotask(() => {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setInvoice(null)
      setError(null)
      const id = parseEntityId(invoiceID)
      if (id === null) { setError('Factura no encontrada'); return }
      Promise.all([getInvoiceByID(id).catch(reason => failed(reason, 'Factura')), getInvoiceLinesByID(id).catch(reason => failed(reason, 'Líneas'))]).then(([headers, lines]) => {
        if (cancelled || !isSessionCurrent(requestRevision)) return
        if (!rowWithIdSchema('NumeroFactura', id).safeParse(headers[0]).success) { setError('Factura no encontrada'); return }
        setInvoice({header: headers[0], lines})
      })
        .catch(() => { if (!cancelled && isSessionCurrent(requestRevision)) setError(previous => previous ?? 'No fue posible obtener la factura. Intente nuevamente.') })
    })
    return () => { cancelled = true }
  }, [invoiceID, refreshKey, revision, isSessionCurrent, invalidateSession])

  const header = invoice?.header
  const total = invoice?.lines.reduce((sum, line) => sum + line.TotalLinea, 0) ?? 0

  return (
    <main className="flex min-w-0 flex-1 bg-muted/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <BackLink href="/sales">Volver a ventas</BackLink>

        {!error && !invoice && <DetailSkeleton label="Cargando factura..." />}
        {error && <DetailError message={error} onRetry={parseEntityId(invoiceID) !== null ? () => setRefreshKey(key => key + 1) : undefined} />}

        {invoice && header && !error && (
          <>
            <DetailHero
              badge={<ReceiptTextIcon className="size-6" />}
              eyebrow={`Factura #${header.NumeroFactura}`}
              title={header.NombreCliente}
              tags={<>
                <Badge variant="secondary"><CalendarIcon aria-hidden="true" />{dateFormatter.format(new Date(header.FechaFactura))}</Badge>
                {header.NombreMetodoEntrega && <Badge variant="outline"><TruckIcon aria-hidden="true" />{header.NombreMetodoEntrega}</Badge>}
              </>}
              action={<Button nativeButton={false} render={<Link href={`/sales/${header.NumeroFactura}/edit`} />} className="shrink-0"><PencilIcon data-icon="inline-start" />Editar factura</Button>}
              stats={[
                { icon: DollarSignIcon, label: 'Total facturado', value: `$${amountFormatter.format(total)}` },
                { icon: ListOrderedIcon, label: 'Líneas', value: String(invoice.lines.length) },
                { icon: HashIcon, label: 'Número de orden', value: header.NumeroOrden },
                { icon: BadgeCheckIcon, label: 'Vendedor', value: header.NombreVendedor, title: header.NombreVendedor ?? undefined },
              ]}
            />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 lg:col-span-2">
                <SectionCard icon={PackageIcon} title="Productos facturados" description={`${invoice.lines.length} ${invoice.lines.length === 1 ? 'línea' : 'líneas'}`} contentClassName="p-0">
                  {invoice.lines.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-muted-foreground">Esta factura no tiene líneas de productos.</p>
                  ) : (
                    <>
                      <ul className="divide-y md:hidden">
                        {invoice.lines.map((line, index) => (
                          <li key={`${line.StockItemID}-${index}`} className="space-y-2 px-4 py-4 text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <p className="min-w-0 break-words font-medium">{line.NombreProducto}</p>
                              <p className="shrink-0 font-semibold tabular-nums">${amountFormatter.format(line.TotalLinea)}</p>
                            </div>
                            <p className="text-xs text-muted-foreground tabular-nums">{line.Cantidad} × ${amountFormatter.format(line.PrecioUnitario)} · Impuesto {line.ImpuestoAplicado} % (${amountFormatter.format(line.MontoImpuesto)})</p>
                          </li>
                        ))}
                      </ul>
                      <div className="hidden md:block">
                        <Table className="min-w-[640px]">
                          <TableHeader className="bg-muted/50"><TableRow className="hover:bg-transparent">
                            <TableHead className={`pl-4 ${HEAD_CLASS}`}>Producto</TableHead>
                            <TableHead className={`text-right ${HEAD_CLASS}`}>Cantidad</TableHead>
                            <TableHead className={`text-right ${HEAD_CLASS}`}>Precio</TableHead>
                            <TableHead className={`text-right ${HEAD_CLASS}`}>Impuesto</TableHead>
                            <TableHead className={`pr-4 text-right ${HEAD_CLASS}`}>Total</TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {invoice.lines.map((line, index) => (
                              <TableRow key={`${line.StockItemID}-${index}`}>
                                <TableCell className="max-w-72 truncate pl-4 font-medium" title={line.NombreProducto}>{line.NombreProducto}</TableCell>
                                <TableCell className="text-right tabular-nums">{line.Cantidad}</TableCell>
                                <TableCell className="text-right tabular-nums">${amountFormatter.format(line.PrecioUnitario)}</TableCell>
                                <TableCell className="text-right text-muted-foreground tabular-nums">{line.ImpuestoAplicado} % · ${amountFormatter.format(line.MontoImpuesto)}</TableCell>
                                <TableCell className="pr-4 text-right font-semibold tabular-nums">${amountFormatter.format(line.TotalLinea)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-4 py-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase">Total facturado</span>
                    <span className="text-lg font-semibold tabular-nums">${amountFormatter.format(total)}</span>
                  </div>
                </SectionCard>
              </div>

              <div className="min-w-0 space-y-6">
                <SectionCard icon={UserIcon} title="Cliente y contacto">
                  <dl className="space-y-4">
                    <DetailItem label="Cliente" value={header.NombreCliente} />
                    <DetailItem label="Contacto" value={header.NombreContacto} />
                    <DetailItem label="Vendedor" value={header.NombreVendedor} />
                  </dl>
                </SectionCard>
                <SectionCard icon={TruckIcon} title="Entrega">
                  <dl className="space-y-4">
                    <DetailItem label="Método de entrega" value={header.NombreMetodoEntrega} />
                    <DetailItem label="Instrucciones de entrega" value={header.InstruccionesEntrega} />
                  </dl>
                </SectionCard>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
