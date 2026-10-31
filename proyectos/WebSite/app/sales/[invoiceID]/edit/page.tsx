'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeftIcon } from 'lucide-react'
import { getInvoiceForEdit, getInvoiceLinesByID } from '@/app/api/sales'
import { InvoiceForm } from '@/app/sales/invoice-form'
import { toast } from '@/components/ui/toast'
import { parseEntityId } from '@/lib/helpers/entityValidation'
import type { InvoiceEdit, InvoiceLine } from '@/lib/types/sales'

export default function EditInvoicePage() {
  const {invoiceID} = useParams<{invoiceID: string}>()
  const [invoice, setInvoice] = useState<{header: InvoiceEdit; lines: InvoiceLine[]} | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    function showError(message: string) {
      if (cancelled) return
      setError(message)
      toast.add({ type: 'error', title: 'No se pudo cargar la factura para editar', description: message, priority: 'high', timeout: 8000 })
    }
    const id = parseEntityId(invoiceID)
    if (id === null) {
      Promise.resolve().then(() => showError('Factura no encontrada'))
    } else {
      Promise.all([getInvoiceForEdit(id), getInvoiceLinesByID(id)])
        .then(([header, lines]) => { if (!cancelled) setInvoice({header, lines}) })
        .catch((reason) => showError(reason instanceof Error ? reason.message : 'No fue posible cargar la factura'))
    }
    return () => { cancelled = true }
  }, [invoiceID])
  if (invoice && !error) return <InvoiceForm key={invoice.header.InvoiceID} initial={invoice.header} initialLines={invoice.lines} />
  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-8 sm:py-8">
        <Link href={`/sales/${invoiceID}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeftIcon className="size-4" aria-hidden="true" /> Volver al detalle
        </Link>
        {!error && <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Cargando factura...</p>}
      </div>
    </main>
  )
}
