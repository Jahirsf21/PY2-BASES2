'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeftIcon } from 'lucide-react'
import { getStockItemForEdit, getStockItemGroupsByID } from '@/app/api/stockItems'
import { StockItemForm } from '@/app/inventory/stock-item-form'
import { toast } from '@/components/ui/toast'
import { parseEntityId } from '@/lib/helpers/entityValidation'
import type { StockGroup, StockItemEdit } from '@/lib/types/stockItems'

export default function EditStockItemPage() {
  const {stockItemID} = useParams<{stockItemID: string}>()
  const [item, setItem] = useState<{detail: StockItemEdit; groups: StockGroup[]} | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    function showError(message: string) {
      if (cancelled) return
      setError(message)
      toast.add({ type: 'error', title: 'No se pudo cargar el producto para editar', description: message, priority: 'high', timeout: 8000 })
    }
    const id = parseEntityId(stockItemID)
    if (id === null) {
      Promise.resolve().then(() => showError('Producto no encontrado'))
    } else {
      Promise.all([getStockItemForEdit(id), getStockItemGroupsByID(id)])
        .then(([detail, groups]) => { if (!cancelled) setItem({detail, groups}) })
        .catch((reason) => showError(reason instanceof Error ? reason.message : 'No fue posible cargar el producto'))
    }
    return () => { cancelled = true }
  }, [stockItemID])
  if (item && !error) return <StockItemForm key={item.detail.StockItemID} initial={item.detail} initialGroups={item.groups} />
  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-8 sm:py-8">
        <Link href={`/inventory/${stockItemID}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeftIcon className="size-4" aria-hidden="true" /> Volver al detalle
        </Link>
        {!error && <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Cargando producto...</p>}
      </div>
    </main>
  )
}
