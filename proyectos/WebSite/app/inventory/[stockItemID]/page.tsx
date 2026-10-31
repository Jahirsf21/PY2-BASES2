'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const [item, setItem] = useState<StockItemDetail | null>(null)
  const [groups, setGroups] = useState<StockGroup[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const id = parseEntityId(stockItemID)
    if (id === null) {
      Promise.resolve().then(() => { if (!cancelled) setError('Producto no encontrado') })
    } else {
      Promise.all([getStockItemByID(id), getStockItemGroupsByID(id)]).then(([items, stockGroups]) => {
        if (!items[0]) throw new Error('Producto no encontrado')
        if (!cancelled) {
          setItem(items[0])
          setGroups(stockGroups)
        }
      })
        .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'No fue posible obtener el producto') })
    }
    return () => { cancelled = true }
  }, [stockItemID])

  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <Link href="/inventory" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Volver al inventario
        </Link>

        {!error && !item && <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Cargando producto...</p>}
        {error && <p role="alert" className="rounded-lg border bg-card p-6 text-sm text-destructive">{error}</p>}

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
