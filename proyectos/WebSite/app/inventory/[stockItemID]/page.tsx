'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/components/auth-session'
import { getStockItemByID, getStockItemGroupsByID } from '@/app/api/stockItems'
import { parseEntityId } from '@/lib/helpers/entityValidation'
import type { StockGroup, StockItemDetail } from '@/lib/types/stockItems'

const numberFormatter = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 3 })
const amountFormatter = new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return <div><dt className="text-sm text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value ?? 'No disponible'}</dd></div>
}

export default function StockItemDetailPage() {
  const { stockItemID } = useParams<{ stockItemID: string }>()
  return <StockItemDetailContent key={stockItemID} stockItemID={stockItemID} />
}

/** Impide reutilizar datos de otro producto o sucursal mientras llegan las lecturas. */
function StockItemDetailContent({ stockItemID }: { stockItemID: string }) {
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const [item, setItem] = useState<StockItemDetail | null>(null)
  const [groups, setGroups] = useState<StockGroup[]>([])
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision
    /** El 401 de cualquiera de las dos lecturas siempre llega al proveedor de sesión. */
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
      setItem(null)
      setGroups([])
      setError(null)
      const id = parseEntityId(stockItemID)
      if (id === null) { setError('Producto no encontrado'); return }
      Promise.all([getStockItemByID(id).catch(reason => failed(reason, 'Producto')), getStockItemGroupsByID(id).catch(reason => failed(reason, 'Grupos'))]).then(([items, stockGroups]) => {
        if (cancelled || !isSessionCurrent(requestRevision)) return
        if (!items[0] || items[0].StockItemID !== id) { setError('Producto no encontrado'); return }
          setItem(items[0])
          setGroups(stockGroups)
      })
        .catch(() => { if (!cancelled && isSessionCurrent(requestRevision)) setError(previous => previous ?? 'No fue posible obtener el producto. Intente nuevamente.') })
    })
    return () => { cancelled = true }
  }, [stockItemID, refreshKey, revision, isSessionCurrent, invalidateSession])

  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <Link href="/inventory" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Volver al inventario
        </Link>

        {!error && !item && <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Cargando producto...</p>}
        {error && <div className="space-y-3 rounded-lg border bg-card p-6"><p role="alert" className="text-sm text-destructive">{error}</p>{parseEntityId(stockItemID) !== null && <Button type="button" variant="outline" onClick={() => setRefreshKey(key => key + 1)}>Reintentar detalle</Button>}</div>}

        {item && !error && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Producto #{item.StockItemID}</p>
                <h1 className="break-words text-2xl font-semibold tracking-tight">{item.NombreProducto}</h1>
              </div>
              <Button nativeButton={false} render={<Link href={`/inventory/${item.StockItemID}/edit`} />} variant="outline">Editar producto</Button>
            </div>

            <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="general-title">
              <h2 id="general-title" className="mb-4 text-lg font-semibold">Datos generales</h2>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField label="Proveedor" value={item.NombreProveedor} />
                 <DetailField label="Grupos de productos" value={groups.length ? groups.map((group) => group.NombreGrupoProducto).join(', ') : null} />
                <DetailField label="Color" value={item.Color} />
                <DetailField label="Marca" value={item.Marca} />
                <DetailField label="Talla" value={item.Talla} />
                <DetailField label="Empaque unitario" value={item.UnidadEmpaquetamiento} />
                <DetailField label="Empaque exterior" value={item.Empaquetamiento} />
                <DetailField label="Unidades por empaque" value={item.CantidadEmpaquetamiento} />
                <DetailField label="Palabras clave" value={item.PalabrasClave} />
              </dl>
            </section>

            <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="prices-title">
              <h2 id="prices-title" className="mb-4 text-lg font-semibold">Precios e impuestos</h2>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField label="Precio unitario" value={item.PrecioUnitario == null ? null : `$${amountFormatter.format(item.PrecioUnitario)}`} />
                <DetailField label="Precio de venta recomendado" value={item.PrecioVenta == null ? null : `$${amountFormatter.format(item.PrecioVenta)}`} />
                <DetailField label="Impuesto aplicado" value={item.Impuesto == null ? null : `${numberFormatter.format(item.Impuesto)} %`} />
                <DetailField label="Peso por unidad" value={item.Peso == null ? null : numberFormatter.format(item.Peso)} />
              </dl>
            </section>

            <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="stock-title">
              <h2 id="stock-title" className="mb-4 text-lg font-semibold">Inventario</h2>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField label="Cantidad disponible" value={item.CantidadDisponible} />
                <DetailField label="Ubicación en bodega" value={item.Ubicacion} />
              </dl>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
