'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { BadgeDollarSignIcon, BoxesIcon, DollarSignIcon, InfoIcon, PackageIcon, PackageOpenIcon, PaletteIcon, PencilIcon, PercentIcon, TagIcon, WarehouseIcon } from 'lucide-react'
import { BackLink, DetailError, DetailHero, DetailItem, DetailSkeleton, SectionCard } from '@/components/detail-kit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSession } from '@/components/auth-session'
import { getStockItemByID, getStockItemGroupsByID } from '@/app/api/stockItems'
import { parseEntityId } from '@/lib/helpers/entityValidation'
import { rowWithIdSchema } from '@/lib/schemas/responses'
import type { StockGroup, StockItemDetail } from '@/lib/types/stockItems'

const numberFormatter = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 3 })
const amountFormatter = new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Página de detalle de un producto en la sucursal. */
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
        if (!rowWithIdSchema('StockItemID', id).safeParse(items[0]).success) { setError('Producto no encontrado'); return }
          setItem(items[0])
          setGroups(stockGroups)
      })
        .catch(() => { if (!cancelled && isSessionCurrent(requestRevision)) setError(previous => previous ?? 'No fue posible obtener el producto. Intente nuevamente.') })
    })
    return () => { cancelled = true }
  }, [stockItemID, refreshKey, revision, isSessionCurrent, invalidateSession])

  return (
    <main className="flex min-w-0 flex-1 bg-muted/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <BackLink href="/inventory">Volver al inventario</BackLink>

        {!error && !item && <DetailSkeleton label="Cargando producto..." />}
        {error && <DetailError message={error} onRetry={parseEntityId(stockItemID) !== null ? () => setRefreshKey(key => key + 1) : undefined} />}

        {item && !error && (
          <>
            <DetailHero
              badge={<PackageIcon className="size-6" />}
              eyebrow={`Producto #${item.StockItemID}`}
              title={item.NombreProducto}
              tags={<>
                {groups.map((group) => <Badge key={group.StockGroupID} variant="secondary"><TagIcon aria-hidden="true" />{group.NombreGrupoProducto}</Badge>)}
                {item.Color && <Badge variant="outline"><PaletteIcon aria-hidden="true" />{item.Color}</Badge>}
                {!item.CantidadDisponible && <Badge variant="destructive">Sin existencias</Badge>}
              </>}
              action={<Button nativeButton={false} render={<Link href={`/inventory/${item.StockItemID}/edit`} />} className="shrink-0"><PencilIcon data-icon="inline-start" />Editar producto</Button>}
              stats={[
                { icon: DollarSignIcon, label: 'Precio unitario', value: item.PrecioUnitario == null ? null : `$${amountFormatter.format(item.PrecioUnitario)}` },
                { icon: BadgeDollarSignIcon, label: 'Precio de venta', value: item.PrecioVenta == null ? null : `$${amountFormatter.format(item.PrecioVenta)}` },
                { icon: PercentIcon, label: 'Impuesto', value: item.Impuesto == null ? null : `${numberFormatter.format(item.Impuesto)} %` },
                { icon: BoxesIcon, label: 'Disponible', value: item.CantidadDisponible == null ? null : numberFormatter.format(item.CantidadDisponible) },
              ]}
            />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-6 lg:col-span-2">
                <SectionCard icon={InfoIcon} title="Datos generales" description="Proveedor e identificación del producto.">
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailItem label="Proveedor" value={item.NombreProveedor} />
                    <DetailItem label="Marca" value={item.Marca} />
                    <DetailItem label="Talla" value={item.Talla} />
                    <DetailItem label="Color" value={item.Color} />
                    <div className="sm:col-span-2"><DetailItem label="Palabras clave" value={item.PalabrasClave} /></div>
                  </dl>
                </SectionCard>
                <SectionCard icon={PackageOpenIcon} title="Empaque" description="Cómo se agrupa y almacena el producto.">
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailItem label="Empaque unitario" value={item.UnidadEmpaquetamiento} />
                    <DetailItem label="Empaque exterior" value={item.Empaquetamiento} />
                    <DetailItem label="Unidades por empaque" value={item.CantidadEmpaquetamiento} />
                    <DetailItem label="Peso por unidad" value={item.Peso == null ? null : numberFormatter.format(item.Peso)} />
                  </dl>
                </SectionCard>
              </div>

              <div className="min-w-0 space-y-6">
                <SectionCard icon={WarehouseIcon} title="Inventario" description="Existencias en esta sucursal."
                  action={<Button nativeButton={false} variant="outline" size="sm" render={<Link href={`/inventory/${item.StockItemID}/holdings`} />}><BoxesIcon data-icon="inline-start" />Ajustar existencias</Button>}>
                  <dl className="space-y-4">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <dt className="text-xs text-muted-foreground">Cantidad disponible</dt>
                      <dd className="mt-1 text-3xl font-semibold tabular-nums">{item.CantidadDisponible == null ? <span className="text-base font-normal text-muted-foreground italic">No disponible</span> : numberFormatter.format(item.CantidadDisponible)}</dd>
                    </div>
                    <DetailItem label="Ubicación en bodega" value={item.Ubicacion} mono />
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
