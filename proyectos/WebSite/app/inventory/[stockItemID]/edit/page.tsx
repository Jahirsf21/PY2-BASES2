'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeftIcon } from 'lucide-react'
import { z } from 'zod'
import { getStockItemForEdit } from '@/app/api/stockItems'
import { StockItemForm } from '@/app/inventory/stock-item-form'
import { Button } from '@/components/ui/button'
import { useSession } from '@/components/auth-session'
import { parseEntityId } from '@/lib/helpers/entityValidation'
import { arrayResponseSchema, rowWithIdSchema } from '@/lib/schemas/responses'
import { versionSchema } from '@/lib/schemas/stockItems'
import type { StockItemEdit } from '@/lib/types/stockItems'

/** Esquema de la precarga de edición: el producto solicitado, sus grupos y una versión válida. */
function editResponseSchema(id: number) {
  return rowWithIdSchema('StockItemID', id).and(z.looseObject({ Version: versionSchema, Grupos: arrayResponseSchema }))
}

/** Página para editar el catálogo de un producto. */
export default function EditStockItemPage() {
  const {stockItemID} = useParams<{stockItemID: string}>()
  return <EditStockItemContent key={stockItemID} stockItemID={stockItemID} />
}

/** Precarga catálogo, grupos y versión en una sola lectura de Corporativo. */
function EditStockItemContent({ stockItemID }: { stockItemID: string }) {
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const [item, setItem] = useState<StockItemEdit | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    let cancelled = false
    const requestRevision = revision
    queueMicrotask(async () => {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setItem(null)
      setError(null)
      const id = parseEntityId(stockItemID)
      if (id === null) { setError('Producto no encontrado'); return }
      try {
        const detail = await getStockItemForEdit(id)
        if (cancelled || !isSessionCurrent(requestRevision)) return
        if (!editResponseSchema(id).safeParse(detail).success) throw new SyntaxError('Precarga inesperada')
        setItem(detail)
      } catch (reason) {
        if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); return }
        if (cancelled || !isSessionCurrent(requestRevision)) return
        const status = reason instanceof Error ? reason.cause : null
        setError(status === 403 ? 'Sin permisos para editar productos.' : reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503) ? 'No fue posible cargar el producto. Intente nuevamente.' : reason instanceof Error ? reason.message : 'No fue posible cargar el producto.')
      }
    })
    return () => { cancelled = true }
  }, [stockItemID, refreshKey, revision, isSessionCurrent, invalidateSession])
  if (item && !error) return <StockItemForm key={`${item.StockItemID}-${item.Version}`} initial={item} onReload={() => setRefreshKey(key => key + 1)} />
  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-8 sm:py-8">
        <Link href={`/inventory/${stockItemID}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeftIcon className="size-4" aria-hidden="true" /> Volver al detalle
        </Link>
        {!error && <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Cargando producto...</p>}
        {error && <div className="space-y-3 rounded-lg border bg-card p-4"><p role="alert" className="text-sm text-destructive">{error}</p>{parseEntityId(stockItemID) !== null && <Button type="button" variant="outline" onClick={() => setRefreshKey(key => key + 1)}>Reintentar precarga</Button>}</div>}
      </div>
    </main>
  )
}
