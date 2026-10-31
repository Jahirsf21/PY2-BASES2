'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getSupplierForEdit } from '@/app/api/suppliers'
import { SupplierForm } from '@/app/suppliers/supplier-form'
import { toast } from '@/components/ui/toast'
import { parseEntityId } from '@/lib/helpers/entityValidation'
import type { SupplierEdit, SupplierRouteParams } from '@/lib/types/suppliers'

export default function EditSupplierPage() {
  const { supplierID } = useParams<SupplierRouteParams>()
  const [supplier, setSupplier] = useState<SupplierEdit | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    function showError(message: string) {
      if (cancelled) return
      setError(message)
      toast.add({ type: 'error', title: 'No se pudo cargar el proveedor para editar', description: message, priority: 'high', timeout: 8000 })
    }
    const id = parseEntityId(supplierID)
    if (id === null) {
      Promise.resolve().then(() => showError('Proveedor no encontrado'))
    } else {
      getSupplierForEdit(id).then((data) => { if (!cancelled) setSupplier(data) })
        .catch((reason) => showError(reason instanceof Error ? reason.message : 'No fue posible cargar el proveedor'))
    }
    return () => { cancelled = true }
  }, [supplierID])

  if (supplier && !error) return <SupplierForm key={supplier.SupplierID} initial={supplier} />
  return (
    <main className="flex min-w-0 flex-1 bg-muted/30"><div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-8 sm:py-8">
      <Link href={`/suppliers/${supplierID}`} className="text-sm text-muted-foreground hover:underline">Volver al detalle</Link>
      {!error && <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Cargando proveedor...</p>}
    </div></main>
  )
}
