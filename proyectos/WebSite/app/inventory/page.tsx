'use client'

import { pageNumberSchema } from '@/lib/schemas/pagination'
import { arrayResponseSchema } from '@/lib/schemas/responses'
import type { SubmitEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDownIcon, PackageIcon, XIcon } from 'lucide-react'
import { SCROLL_LIST_CLASS } from '@/components/form-kit'
import { EmptyState, ErrorState, FilterCard, HEAD_CLASS, ListCard, ListPagination, NewButton, PageHeader, ReadErrorsBanner, RowActions, RowMenu, SearchField, SelectionBar, TableSkeleton } from '@/components/list-kit'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { useSession } from '@/components/auth-session'
import { deleteStockItemByID, getStockGroups, getStockItems } from '@/app/api/stockItems'
import type { StockGroup, StockItemFilters, StockItemsResponse } from '@/lib/types/stockItems'

const PAGE_SIZE = 10

const initialFilters: StockItemFilters = {
  stockItemName: '',
  stockGroupIDs: [],
}

/** Presenta errores controlados del módulo sin cambiar la sesión por un 403/503. */
function inventoryError(reason: unknown): string {
  const status = reason instanceof Error ? reason.cause : null
  if (status === 403) return 'Sin permisos para realizar esta operación de inventario.'
  if (reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503)) return 'No fue posible completar la operación. Intente nuevamente.'
  return reason instanceof Error ? reason.message : 'No fue posible obtener los productos.'
}

/** Lista de productos de la sucursal con filtros por nombre y grupos, paginación y eliminación. */
export default function InventoryPage() {
  const { revision, isSessionCurrent, invalidateSession } = useSession()
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
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [groupsRefresh, setGroupsRefresh] = useState(0)
  const deleteLock = useRef(false)
  const lifetime = useRef({ active: false })

  useEffect(() => {
    const screen = { active: true }
    lifetime.current = screen
    return () => { screen.active = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision

    /** Carga la página de productos con los filtros aplicados si la sesión sigue vigente. */
    async function loadData() {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setIsLoading(true)
      setError(null)
      try {
        const itemsData = await getStockItems(filters.stockItemName, filters.stockGroupIDs, pageNumber, PAGE_SIZE)
        if (!cancelled && isSessionCurrent(requestRevision)) setStockItemsResponse(itemsData)
      } catch (reason) {
        if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); return }
        if (!cancelled && isSessionCurrent(requestRevision)) {
          setStockItemsResponse(null)
          setSelectedStockItemID(null)
          setIsConfirmingDelete(false)
          setError(inventoryError(reason))
        }
      } finally {
        if (!cancelled && isSessionCurrent(requestRevision)) setIsLoading(false)
      }
    }

    queueMicrotask(() => { void loadData() })
    return () => { cancelled = true }
  }, [filters, pageNumber, refreshKey, revision, isSessionCurrent, invalidateSession])

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision
    queueMicrotask(async () => {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setGroupsLoading(true)
      setGroupsError(null)
      try {
        const result = await getStockGroups()
        if (!cancelled && isSessionCurrent(requestRevision)) {
          if (!arrayResponseSchema.safeParse(result).success) throw new SyntaxError('Catálogo inesperado')
          setGroups(result)
        }
      } catch (reason) {
        if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); return }
        if (!cancelled && isSessionCurrent(requestRevision)) { setGroups([]); setGroupsError(inventoryError(reason)) }
      } finally {
        if (!cancelled && isSessionCurrent(requestRevision)) setGroupsLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [groupsRefresh, revision, isSessionCurrent, invalidateSession])

  /** Aplica los filtros del formulario y vuelve a la primera página. */
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDeleting) return
    clearSelection()
    setFilters({ stockItemName, stockGroupIDs })
    setPageNumber(1)
  }

  /** Limpia los filtros y vuelve a la primera página. */
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

  /** Quita la selección del producto y cierra la confirmación de borrado. */
  function clearSelection() {
    setSelectedStockItemID(null)
    setIsConfirmingDelete(false)
  }

  /** Selecciona o deselecciona un producto de la lista. */
  function toggleStockItem(stockItemID: number) {
    if (isLoading || isDeleting) return
    if (selectedStockItemID === stockItemID) {
      clearSelection()
      return
    }
    setSelectedStockItemID(stockItemID)
    setIsConfirmingDelete(false)
  }

  /** Cambia la página de resultados y quita la selección. */
  function changePage(page: number) {
    clearSelection()
    setPageNumber(page)
  }

  /** Va a la página escrita si es válida. */
  function handlePageSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const page = pageNumberSchema(totalPages).safeParse(new FormData(event.currentTarget).get('pageNumber'))
    if (!isLoading && !isDeleting && page.success) {
      changePage(page.data)
    }
  }

  /** Mantiene confirmación y envío único dentro de su pantalla y sesión originales. */
  async function handleDeleteStockItem() {
    const requestRevision = revision
    const screen = lifetime.current
    if (!selectedStockItem || !isConfirmingDelete || isLoading || isDeleting || deleteLock.current || !screen.active || !isSessionCurrent(requestRevision)) return
    deleteLock.current = true

    setIsDeleting(true)
    try {
      await deleteStockItemByID(selectedStockItem.StockItemID)
      if (!screen.active || !isSessionCurrent(requestRevision)) return
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
    } catch (reason) {
      if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); return }
      if (!screen.active || !isSessionCurrent(requestRevision)) return
      setIsConfirmingDelete(false)
      toast.add({
        type: 'error',
        title: 'No se pudo eliminar el producto',
        description: reason instanceof TypeError ? 'No fue posible confirmar la eliminación. Compruebe el resultado antes de repetirla.' : inventoryError(reason),
        priority: 'high',
        timeout: 8000,
      })
    } finally {
      deleteLock.current = false
      if (screen.active && isSessionCurrent(requestRevision)) setIsDeleting(false)
    }
  }

  const activeFilters = [filters.stockItemName.trim() !== '', filters.stockGroupIDs.length > 0].filter(Boolean).length
  /** Vuelve a consultar los productos y los grupos. */
  const retryReads = () => { setRefreshKey(key => key + 1); setGroupsRefresh(key => key + 1) }
  const groupLabel = stockGroupIDs.length === 0 ? 'Todos los grupos' : stockGroupIDs.length === 1 ? groups.find((group) => group.StockGroupID === stockGroupIDs[0])?.NombreGrupoProducto ?? '1 grupo seleccionado' : `${stockGroupIDs.length} grupos seleccionados`

  return (
    <main className="flex min-w-0 flex-1 bg-muted/40">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-24 sm:px-8 sm:pt-8 lg:pb-8">
        <PageHeader icon={PackageIcon} title="Inventario" subtitle={`${totalCount} ${totalCount === 1 ? 'producto' : 'productos'}${activeFilters > 0 ? ' con los filtros aplicados' : ' registrados'}`}
          action={<NewButton href="/inventory/new" label="Nuevo producto" />} />

        <ReadErrorsBanner messages={groupsError ? [`Grupos de productos: ${groupsError}`] : []} onRetry={retryReads} disabled={isLoading || groupsLoading || isDeleting} />

        <FilterCard activeFilters={activeFilters} onSubmit={handleSubmit} onReset={resetFilters} disabled={isDeleting} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px_auto] md:items-end">
          <SearchField id="stockItemName" label="Nombre del producto" placeholder="Buscar por nombre" value={stockItemName} onChange={setStockItemName} disabled={isDeleting} />
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="stockGroup">Grupos de productos</Label>
            <DropdownMenu>
              <DropdownMenuTrigger id="stockGroup" type="button" disabled={isDeleting || groupsLoading || Boolean(groupsError)}
                className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30">
                <span className={stockGroupIDs.length ? 'min-w-0 truncate' : 'min-w-0 truncate'}>{groupLabel}</span>
                {stockGroupIDs.length > 1 ? <Badge variant="secondary" className="shrink-0">{stockGroupIDs.length}</Badge> : <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-(--anchor-width) min-w-56 max-w-[calc(100vw-2rem)] overflow-hidden p-0">
                <ScrollArea className={SCROLL_LIST_CLASS}>
                  <div className="p-1">
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
                  </div>
                </ScrollArea>
                {stockGroupIDs.length > 0 && (
                  <div className="border-t p-1">
                    <DropdownMenuItem disabled={isDeleting} onClick={() => setStockGroupIDs([])} closeOnClick={false} className="text-muted-foreground"><XIcon />Quitar filtro de grupos</DropdownMenuItem>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </FilterCard>

        <ListCard title="Listado de productos" loadingMore={isLoading && stockItems.length > 0} pageNumber={pageNumber} totalPages={totalPages}>
          <SelectionBar selectedName={selectedStockItem?.NombreProducto ?? null} hint="Marque la casilla de un producto para eliminarlo." noun="producto" onClear={clearSelection}
            confirming={isConfirmingDelete} onConfirmingChange={setIsConfirmingDelete} deleting={isDeleting} disabled={!selectedStockItem || isLoading} onDelete={() => void handleDeleteStockItem()} />

          <div className="min-h-[20rem] md:min-h-[30rem]" aria-busy={isLoading}>
            {isLoading && stockItems.length === 0 && <TableSkeleton label="Cargando productos..." />}
            {!isLoading && error && <ErrorState message={error} onRetry={retryReads} disabled={isLoading || groupsLoading || isDeleting} />}
            {!isLoading && !error && stockItems.length === 0 && <EmptyState message="No se encontraron productos con los filtros seleccionados." onReset={activeFilters > 0 ? resetFilters : undefined} />}

            {!error && stockItems.length > 0 && (
              <>
                <ul className="divide-y md:hidden">
                  {stockItems.map((item) => (
                    <li key={item.StockItemID} data-state={selectedStockItemID === item.StockItemID ? 'selected' : undefined} className="flex gap-3 px-4 py-4 transition-colors data-[state=selected]:bg-muted">
                      <Checkbox id={`stock-item-mobile-${item.StockItemID}`} aria-label={`Seleccionar a ${item.NombreProducto}`} checked={selectedStockItemID === item.StockItemID} disabled={isLoading || isDeleting} onCheckedChange={() => toggleStockItem(item.StockItemID)} className="mt-2.5" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-start gap-3">
                          <ProductIcon />
                          <div className="min-w-0 flex-1">
                            <Link href={`/inventory/${item.StockItemID}`} className="block break-words font-medium hover:underline">{item.NombreProducto}</Link>
                            <p className="text-xs text-muted-foreground tabular-nums">#{item.StockItemID}</p>
                          </div>
                          <StockQuantity value={item.CantidadTotalEnInventarios} />
                        </div>
                        <GroupBadges value={item.NombreGrupoProducto} />
                      </div>
                      <RowMenu detailHref={`/inventory/${item.StockItemID}`} editHref={`/inventory/${item.StockItemID}/edit`} name={item.NombreProducto} />
                    </li>
                  ))}
                </ul>

                <div className="hidden md:block">
                  <Table className="min-w-[760px] table-fixed">
                    <colgroup><col className="w-14" /><col /><col className="w-[28%]" /><col className="w-40" /><col className="w-44" /></colgroup>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-center"><span className="sr-only">Seleccionar</span></TableHead>
                        <TableHead className={HEAD_CLASS}>Producto</TableHead>
                        <TableHead className={HEAD_CLASS}>Grupos</TableHead>
                        <TableHead className={`text-right ${HEAD_CLASS}`}>En inventario</TableHead>
                        <TableHead className={`text-right ${HEAD_CLASS}`}>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockItems.map((item) => (
                        <TableRow key={item.StockItemID} data-state={selectedStockItemID === item.StockItemID ? 'selected' : undefined}>
                          <TableCell className="p-0">
                            <label className="flex min-h-14 cursor-pointer items-center justify-center" htmlFor={`stock-item-desktop-${item.StockItemID}`}>
                              <Checkbox id={`stock-item-desktop-${item.StockItemID}`} aria-label={`Seleccionar a ${item.NombreProducto}`} checked={selectedStockItemID === item.StockItemID} disabled={isLoading || isDeleting} onCheckedChange={() => toggleStockItem(item.StockItemID)} />
                            </label>
                          </TableCell>
                          <TableCell>
                            <div className="flex min-w-0 items-center gap-3">
                              <ProductIcon />
                              <div className="min-w-0">
                                <Link href={`/inventory/${item.StockItemID}`} className="block truncate font-medium hover:underline" title={item.NombreProducto}>{item.NombreProducto}</Link>
                                <p className="text-xs text-muted-foreground tabular-nums">#{item.StockItemID}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><GroupBadges value={item.NombreGrupoProducto} /></TableCell>
                          <TableCell className="text-right"><StockQuantity value={item.CantidadTotalEnInventarios} /></TableCell>
                          <TableCell><RowActions detailHref={`/inventory/${item.StockItemID}`} editHref={`/inventory/${item.StockItemID}/edit`} name={item.NombreProducto} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>

          <ListPagination inputId="inventoryPageNumber" noun="productos" pageNumber={pageNumber} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} shown={stockItems.length} disabled={isLoading || isDeleting} onChange={changePage} onSubmit={handlePageSubmit} />
        </ListCard>
      </section>
    </main>
  )
}

const quantityFormatter = new Intl.NumberFormat('es-CR')

/** Ícono de producto para las filas de la lista. */
function ProductIcon() {
  return <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/10"><PackageIcon className="size-4" /></span>
}

/** Cantidad en inventario, destacando los productos sin existencias. */
function StockQuantity({ value }: { value: number }) {
  if (!value) return <Badge variant="destructive">Sin existencias</Badge>
  return <span className="font-semibold tabular-nums">{quantityFormatter.format(value)}</span>
}

/** Muestra hasta dos grupos como etiquetas y resume el resto. */
function GroupBadges({ value }: { value: string | null }) {
  const names = (value ?? '').split(',').map(name => name.trim()).filter(Boolean)
  if (names.length === 0) return <span className="text-sm text-muted-foreground italic">Sin grupo</span>
  return (
    <div className="flex min-w-0 flex-wrap gap-1" title={names.join(', ')}>
      {names.slice(0, 2).map(name => <Badge key={name} variant="secondary" className="max-w-full"><span className="truncate">{name}</span></Badge>)}
      {names.length > 2 && <Badge variant="outline">+{names.length - 2}</Badge>}
    </div>
  )
}
