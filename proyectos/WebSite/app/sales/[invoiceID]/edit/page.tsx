'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeftIcon } from 'lucide-react'
import { getInvoiceForEdit, getInvoiceLinesByID } from '@/app/api/sales'
import { InvoiceForm } from '@/app/sales/invoice-form'
import { Button } from '@/components/ui/button'
import { useSession } from '@/components/auth-session'
import { parseEntityId } from '@/lib/helpers/entityValidation'
import type { InvoiceEdit, InvoiceLine } from '@/lib/types/sales'

export default function EditInvoicePage() {
  const {invoiceID} = useParams<{invoiceID: string}>()
  return <EditInvoiceContent key={invoiceID} invoiceID={invoiceID} />
}

/** La factura editable se monta únicamente con encabezado y líneas vigentes. */
function EditInvoiceContent({ invoiceID }: { invoiceID: string }) {
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const [invoice, setInvoice] = useState<{header: InvoiceEdit; lines: InvoiceLine[]} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    let cancelled = false
    const requestRevision = revision
    /** No pierde un 401 de líneas si el encabezado ya falló, o viceversa. */
    function failed(reason: unknown): never {
      if (reason instanceof Error && reason.cause === 401) invalidateSession(requestRevision)
      throw reason
    }
    queueMicrotask(async () => {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setInvoice(null)
      setError(null)
      const id = parseEntityId(invoiceID)
      if (id === null) { setError('Factura no encontrada'); return }
      try {
        const [header, lines] = await Promise.all([getInvoiceForEdit(id).catch(failed), getInvoiceLinesByID(id).catch(failed)])
        if (cancelled || !isSessionCurrent(requestRevision)) return
        if (!header || header.InvoiceID !== id || !Array.isArray(lines)) throw new SyntaxError('Precarga inesperada')
        setInvoice({ header, lines })
      } catch (reason) {
        if (cancelled || !isSessionCurrent(requestRevision)) return
        const status = reason instanceof Error ? reason.cause : null
        setError(status === 403 ? 'Sin permisos para editar facturas.' : reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503) ? 'No fue posible cargar la factura. Intente nuevamente.' : reason instanceof Error ? reason.message : 'No fue posible cargar la factura.')
      }
    })
    return () => { cancelled = true }
  }, [invoiceID, refreshKey, revision, isSessionCurrent, invalidateSession])
  if (invoice && !error) return <InvoiceForm key={invoice.header.InvoiceID} initial={invoice.header} initialLines={invoice.lines} />
  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-8 sm:py-8">
        <Link href={`/sales/${invoiceID}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeftIcon className="size-4" aria-hidden="true" /> Volver al detalle
        </Link>
        {!error && <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Cargando factura...</p>}
        {error && <div className="space-y-3 rounded-lg border bg-card p-4"><p role="alert" className="text-sm text-destructive">{error}</p>{parseEntityId(invoiceID) !== null && <Button type="button" variant="outline" onClick={() => setRefreshKey(key => key + 1)}>Reintentar precarga</Button>}</div>}
      </div>
    </main>
  )
}
