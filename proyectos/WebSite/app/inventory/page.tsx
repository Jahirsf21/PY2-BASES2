'use client'

import type { SubmitEvent } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, RotateCcwIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { deleteStockItemByID, getStockGroups, getStockItems } from '@/app/api/stockItems'
import type { StockGroup, StockItemFilters, StockItemsResponse } from '@/lib/types/stockItems'

const PAGE_SIZE = 10

const initialFilters: StockItemFilters = {
  stockItemName: '',
  stockGroupIDs: [],
}

export default function InventoryPage() {
  const [stockItemName, setStockItemName] = useState('')
  const [stockGroupIDs, setStockGroupIDs] = useState<StockItemFilters['stockGroupIDs']>([])
  const [filters, setFilters] = useState<StockItemFilters>(initialFilters)
  const [pageNumber, setPageNumber] = useState(1)
  const [stockItemsResponse, setStockItemsResponse] = useState<StockItemsResponse | null>(null)
  const [groups, setGroups] = useState<StockGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStockItemID, setSelectedStockItemID] = useState<number | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setIsLoading(true)
      setError(null)
      try {
        const itemsData = await getStockItems(filters.stockItemName, filters.stockGroupIDs, pageNumber, PAGE_SIZE)
        if (!cancelled) setStockItemsResponse(itemsData)
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : 'No fue posible obtener los productos')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadData()
    return () => { cancelled = true }
  }, [filters, pageNumber, refreshKey])

  useEffect(() => {
    getStockGroups().then(setGroups).catch(() => {})
  }, [])

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDeleting) return
    clearSelection()
    setFilters({ stockItemName, stockGroupIDs })
    setPageNumber(1)
  }

  function resetFilters() {
    if (isDeleting) return
    clearSelection()
    setStockItemName('')
    setStockGroupIDs([])
    setFilters(initialFilters)
    setPageNumber(1)
  }

  const stockItems = stockItemsResponse?.data ?? []
  const totalPages = stockItemsResponse?.totalPages ?? 0
  const totalCount = stockItemsResponse?.totalCount ?? 0
  const selectedStockItem = stockItems.find((item) => item.StockItemID === selectedStockItemID) ?? null

  function clearSelection() {
    setSelectedStockItemID(null)
    setIsConfirmingDelete(false)
  }

  function toggleStockItem(stockItemID: number) {
    if (isLoading || isDeleting) return
    if (selectedStockItemID === stockItemID) {
      clearSelection()
      return
    }
    setSelectedStockItemID(stockItemID)
    setIsConfirmingDelete(false)
  }

  function changePage(page: number) {
    clearSelection()
    setPageNumber(page)
  }

  function handlePageSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const page = Number(new FormData(event.currentTarget).get('pageNumber'))
    if (!isLoading && !isDeleting && Number.isInteger(page) && page >= 1 && page <= totalPages) {
      changePage(page)
    }
  }

  async function handleDeleteStockItem() {
    if (!selectedStockItem || !isConfirmingDelete || isLoading || isDeleting) return

    setIsDeleting(true)
    try {
      await deleteStockItemByID(selectedStockItem.StockItemID)
      setStockItemsResponse((previous) => previous ? {
        ...previous,
        data: previous.data.filter((item) => item.StockItemID !== selectedStockItem.StockItemID),
        totalCount: Math.max(0, previous.totalCount - 1),
        totalPages: Math.ceil(Math.max(0, previous.totalCount - 1) / PAGE_SIZE),
      } : null)
      clearSelection()
      toast.add({ type: 'success', title: 'Producto eliminado', description: `Se eliminó el producto ${selectedStockItem.NombreProducto}.` })
      setIsLoading(true)

      if (stockItems.length === 1 && pageNumber > 1) {
        changePage(pageNumber - 1)
      } else {
        setRefreshKey((key) => key + 1)
      }
    } catch (error) {
      setIsConfirmingDelete(false)
      toast.add({
        type: 'error',
        title: 'No se pudo eliminar el producto',
        description: error instanceof Error ? error.message : 'No fue posible eliminar el producto',
        priority: 'high',
        timeout: 8000,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
            <p className="text-sm text-muted-foreground">{totalCount} {totalCount === 1 ? 'Producto' : 'Productos'}</p>
          </div>
          <Button nativeButton={false} render={<Link href="/inventory/new" />}>
            <PlusIcon data-icon="inline-start" /> Nuevo producto
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="stockItemName">Nombre del producto</Label>
              <Input
                id="stockItemName"
                placeholder="Buscar por nombre"
                value={stockItemName}
                disabled={isDeleting}
                onChange={(event) => setStockItemName(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="stockGroup">Grupos de productos</Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  id="stockGroup"
                  type="button"
                  disabled={isDeleting}
                  className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <span className="min-w-0 truncate">
                    {stockGroupIDs.length === 0 ? 'Todos los grupos' : stockGroupIDs.length === 1 ? groups.find((group) => group.StockGroupID === stockGroupIDs[0])?.NombreGrupoProducto ?? '1 grupo seleccionado' : `${stockGroupIDs.length} grupos seleccionados`}
                  </span>
                  <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-w-[calc(100vw-2rem)]">
                  <DropdownMenuItem disabled={isDeleting} onClick={() => setStockGroupIDs([])} closeOnClick={false}>Quitar filtro de grupos</DropdownMenuItem>
                  {groups.map((group) => (
                    <DropdownMenuCheckboxItem
                      key={group.StockGroupID}
                      checked={stockGroupIDs.includes(group.StockGroupID)}
                      disabled={isDeleting}
                      onCheckedChange={(checked) => setStockGroupIDs((previous) => checked
                        ? previous.includes(group.StockGroupID) ? previous : [...previous, group.StockGroupID]
                        : previous.filter((id) => id !== group.StockGroupID))}
                      closeOnClick={false}
                    >
                      {group.NombreGrupoProducto}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isDeleting}>
                <SearchIcon data-icon="inline-start" />
                Buscar
              </Button>
              <Button type="button" variant="outline" disabled={isDeleting} onClick={resetFilters}>
                <RotateCcwIcon data-icon="inline-start" />
                Limpiar
              </Button>
            </div>
          </form>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-medium">Listado de productos</h2>
            <span className="text-sm text-muted-foreground">
              {isLoading && stockItems.length > 0
                ? 'Actualizando...'
                : `Página ${pageNumber} de ${totalPages}`}
            </span>
          </div>

          <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 break-words text-sm text-muted-foreground" aria-live="polite">
              {selectedStockItem ? `Seleccionado: ${selectedStockItem.NombreProducto}` : 'Seleccione un producto para eliminarlo.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedStockItem && (
                <Button type="button" variant="outline" disabled={isLoading || isDeleting} onClick={clearSelection}>
                  Quitar selección
                </Button>
              )}
              <AlertDialog open={isConfirmingDelete} onOpenChange={(open) => { if (!isDeleting) setIsConfirmingDelete(open) }}>
                <AlertDialogTrigger render={<Button variant="destructive" />} disabled={!selectedStockItem || isLoading || isDeleting}>
                  <Trash2Icon data-icon="inline-start" />
                  Eliminar producto
                </AlertDialogTrigger>
                <AlertDialogContent aria-busy={isDeleting}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar a {selectedStockItem?.NombreProducto}?</AlertDialogTitle>
                    <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction type="button" variant="destructive" disabled={isDeleting || !selectedStockItem} onClick={() => void handleDeleteStockItem()}>
                      {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="min-h-[20rem] md:min-h-[26rem]" aria-busy={isLoading}>
            {isLoading && stockItems.length === 0 && (
              <p className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                Cargando productos...
              </p>
            )}

            {!isLoading && error && (
              <p className="flex h-32 items-center justify-center px-4 text-center text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            {!isLoading && !error && stockItems.length === 0 && (
              <p className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                No se encontraron productos con los filtros seleccionados.
              </p>
            )}

            {!error && stockItems.length > 0 && (
              <>
                <ul className="divide-y md:hidden">
                  {stockItems.map((item) => (
                    <li key={item.StockItemID} data-state={selectedStockItemID === item.StockItemID ? 'selected' : undefined} className="space-y-3 px-4 py-4 data-[state=selected]:bg-muted">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`stock-item-mobile-${item.StockItemID}`}
                          checked={selectedStockItemID === item.StockItemID}
                          disabled={isLoading || isDeleting}
                          onCheckedChange={() => toggleStockItem(item.StockItemID)}
                          className="mt-0.5"
                        />
                        <label htmlFor={`stock-item-mobile-${item.StockItemID}`} className="min-w-0 cursor-pointer break-words text-sm font-medium">
                          {item.NombreProducto}
                        </label>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-4 text-sm">
                        <div className="min-w-0">
                          <dt className="text-xs text-muted-foreground">Grupos</dt>
                          <dd className="break-words">{item.NombreGrupoProducto}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-xs text-muted-foreground">Cantidad en inventario</dt>
                          <dd>{item.CantidadTotalEnInventarios}</dd>
                        </div>
                      </dl>
                      <div className="flex justify-end">
                        <Button nativeButton={false} render={<Link href={`/inventory/${item.StockItemID}`} />} variant="outline" size="sm">Ver detalle</Button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="hidden md:block">
                  <Table className="min-w-[720px] table-fixed">
                    <colgroup>
                      <col className="w-[12%]" />
                      <col className="w-[30%]" />
                      <col className="w-[23%]" />
                      <col className="w-[18%]" />
                      <col className="w-[17%]" />
                    </colgroup>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">Seleccionar</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Grupos</TableHead>
                        <TableHead>Cantidad en inventario</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockItems.map((item) => (
                        <TableRow key={item.StockItemID} data-state={selectedStockItemID === item.StockItemID ? 'selected' : undefined}>
                          <TableCell className="p-0">
                            <label className="flex min-h-10 cursor-pointer items-center justify-center" htmlFor={`stock-item-desktop-${item.StockItemID}`}>
                              <Checkbox
                                id={`stock-item-desktop-${item.StockItemID}`}
                                aria-label={`Seleccionar a ${item.NombreProducto}`}
                                checked={selectedStockItemID === item.StockItemID}
                                disabled={isLoading || isDeleting}
                                onCheckedChange={() => toggleStockItem(item.StockItemID)}
                              />
                            </label>
                          </TableCell>
                          <TableCell className="p-0"><label htmlFor={`stock-item-desktop-${item.StockItemID}`} className="block cursor-pointer truncate p-2" title={item.NombreProducto}>{item.NombreProducto}</label></TableCell>
                          <TableCell className="p-0"><label htmlFor={`stock-item-desktop-${item.StockItemID}`} className="block cursor-pointer truncate p-2" title={item.NombreGrupoProducto}>{item.NombreGrupoProducto}</label></TableCell>
                          <TableCell className="p-0"><label htmlFor={`stock-item-desktop-${item.StockItemID}`} className="block cursor-pointer truncate p-2">{item.CantidadTotalEnInventarios}</label></TableCell>
                          <TableCell><Button nativeButton={false} render={<Link href={`/inventory/${item.StockItemID}`} />} variant="outline" size="sm">Ver detalle</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 border-t px-4 py-3 sm:flex-row sm:justify-between">
            <p className="text-center text-sm text-muted-foreground sm:text-left">
              Mostrando {stockItems.length} de {totalCount} Productos
            </p>
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <div className="flex justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pageNumber === 1 || isLoading || isDeleting}
                  onClick={() => changePage(pageNumber - 1)}
                >
                  <ChevronLeftIcon data-icon="inline-start" />
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pageNumber >= totalPages || isLoading || isDeleting}
                  onClick={() => changePage(pageNumber + 1)}
                >
                  Siguiente
                  <ChevronRightIcon data-icon="inline-end" />
                </Button>
              </div>
              <form className="flex items-center justify-center gap-2" onSubmit={handlePageSubmit}>
                <Label htmlFor="inventoryPageNumber" className="sr-only">Número de página</Label>
                <Input
                  key={pageNumber}
                  id="inventoryPageNumber"
                  name="pageNumber"
                  type="number"
                  min={1}
                  max={totalPages}
                  step={1}
                  required
                  defaultValue={pageNumber}
                  disabled={isLoading || isDeleting || totalPages === 0}
                  onKeyDown={(event) => { if (event.key === '-') event.preventDefault() }}
                  onChange={(event) => {
                    if (event.currentTarget.value !== '' && Number(event.currentTarget.value) < 1) {
                      event.currentTarget.value = '1'
                    }
                  }}
                  className="w-16 text-center"
                />
                <Button type="submit" variant="outline" disabled={isLoading || isDeleting || totalPages === 0}>
                  Ir
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
