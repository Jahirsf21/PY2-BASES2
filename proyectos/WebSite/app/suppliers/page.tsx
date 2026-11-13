'use client'

import { pageNumberSchema } from '@/lib/schemas/pagination'
import { arrayResponseSchema } from '@/lib/schemas/responses'
import type { SubmitEvent } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TruckIcon } from 'lucide-react'
import { EmptyState, EntityAvatar, ErrorState, FilterCard, FilterSelect, HEAD_CLASS, ListCard, ListPagination, PageHeader, ReadErrorsBanner, RowActions, RowMenu, SearchField, TableSkeleton } from '@/components/list-kit'
import { Badge } from '@/components/ui/badge'
// import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
// import { toast } from '@/components/ui/toast'
import { useSession } from '@/components/auth-session'
import { getDeliveryMethods } from '@/app/api/application'
import { getSupplierCategories, getSuppliers } from '@/app/api/suppliers'
import type { DeliveryMethod } from '@/lib/types/deliveryMethods'
import type { SupplierCategory, SupplierFilters, SuppliersResponse } from '@/lib/types/suppliers'

const PAGE_SIZE = 10

const initialFilters: SupplierFilters = {
  supplierName: '',
  supplierCategoryID: null,
  deliveryMethodID: null,
}

/** Conserva mensajes de negocio sin mostrar detalles internos de red o servidor. */
function supplierError(reason: unknown): string {
  const status = reason instanceof Error ? reason.cause : null
  if (status === 403) return 'Sin permisos para realizar esta operación de proveedores.'
  if (reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503)) return 'No fue posible completar la operación. Intente nuevamente.'
  return reason instanceof Error ? reason.message : 'No fue posible obtener los proveedores.'
}

/** Lista de proveedores con filtros por nombre, categoría y método de entrega. */
export default function SuppliersPage() {
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const [supplierName, setSupplierName] = useState('')
  const [supplierCategoryID, setSupplierCategoryID] = useState<SupplierFilters['supplierCategoryID']>(null)
  const [deliveryMethodID, setDeliveryMethodID] = useState<SupplierFilters['deliveryMethodID']>(null)
  const [filters, setFilters] = useState<SupplierFilters>(initialFilters)
  const [pageNumber, setPageNumber] = useState(1)
  const [suppliersResponse, setSuppliersResponse] = useState<SuppliersResponse | null>(null)
  const [categories, setCategories] = useState<SupplierCategory[]>([])
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // const [selectedSupplierID, setSelectedSupplierID] = useState<number | null>(null)
  // const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  // const [isDeleting, setIsDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [catalogRefresh, setCatalogRefresh] = useState(0)
  const [catalogErrors, setCatalogErrors] = useState<{ categories?: string; methods?: string }>({})
  const [catalogLoading, setCatalogLoading] = useState(false)
  // const deleteLock = useRef(false)
  // const lifetime = useRef({ active: false })
//
  // useEffect(() => {
    // const screen = { active: true }
    // lifetime.current = screen
    // return () => { screen.active = false }
  // }, [])

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision

    /** Carga la página de proveedores con los filtros aplicados. */
    async function loadData() {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setIsLoading(true)
      setError(null)
      try {
        const suppliersData = await getSuppliers(filters.supplierName, filters.supplierCategoryID, filters.deliveryMethodID, pageNumber, PAGE_SIZE)
        if (!cancelled && isSessionCurrent(requestRevision)) setSuppliersResponse(suppliersData)
      } catch (reason) {
        if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); return }
        if (!cancelled && isSessionCurrent(requestRevision)) {
          setSuppliersResponse(null)
          setError(supplierError(reason))
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
    /** Cada referencia conserva sus datos o su error, sin ocultar un 401 concurrente. */
    async function load<T>(key: 'categories' | 'methods', read: () => Promise<T[]>, apply: (items: T[]) => void) {
      try {
        if (!isSessionCurrent(requestRevision)) return
        const items = await read()
        if (!cancelled && isSessionCurrent(requestRevision)) {
          if (!arrayResponseSchema.safeParse(items).success) throw new SyntaxError('Catálogo inesperado')
          apply(items)
        }
      } catch (reason) {
        if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); return }
        if (!cancelled && isSessionCurrent(requestRevision)) {
          apply([])
          setCatalogErrors(previous => ({ ...previous, [key]: supplierError(reason) }))
        }
      }
    }
    queueMicrotask(async () => {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setCatalogLoading(true)
      setCatalogErrors({})
      await Promise.all([load('categories', getSupplierCategories, setCategories), load('methods', getDeliveryMethods, setDeliveryMethods)])
      if (!cancelled && isSessionCurrent(requestRevision)) setCatalogLoading(false)
    })
    return () => { cancelled = true }
  }, [catalogRefresh, revision, isSessionCurrent, invalidateSession])

  /** Aplica los filtros del formulario y vuelve a la primera página. */
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilters({ supplierName, supplierCategoryID, deliveryMethodID })
    setPageNumber(1)
  }

  /** Limpia los filtros y vuelve a la primera página. */
  function resetFilters() {
    setSupplierName('')
    setSupplierCategoryID(null)
    setDeliveryMethodID(null)
    setFilters(initialFilters)
    setPageNumber(1)
  }

  const suppliers = suppliersResponse?.data ?? []
  const totalPages = suppliersResponse?.totalPages ?? 0
  const totalCount = suppliersResponse?.totalCount ?? 0
  // const selectedSupplier = suppliers.find((supplier) => supplier.SupplierID === selectedSupplierID) ?? null

  // function clearSelection() {
    // setSelectedSupplierID(null)
    // setIsConfirmingDelete(false)
  // }
//
  // function toggleSupplier(supplierID: number) {
    // if (isLoading || isDeleting) return
    // if (selectedSupplierID === supplierID) {
      // clearSelection()
      // return
    // }
    // setSelectedSupplierID(supplierID)
    // setIsConfirmingDelete(false)
  // }

  /** Cambia la página de resultados. */
  function changePage(page: number) {
    setPageNumber(page)
  }

  /** Va a la página escrita si es válida. */
  function handlePageSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const page = pageNumberSchema(totalPages).safeParse(new FormData(event.currentTarget).get('pageNumber'))
    if (!isLoading && page.success) {
      changePage(page.data)
    }
  }

  // /** Elimina una sola vez y descarta efectos de otra pantalla o revisión de sesión. */
  // async function handleDeleteSupplier() {
    // const requestRevision = revision
    // const screen = lifetime.current
    // if (!selectedSupplier || !isConfirmingDelete || isLoading || isDeleting || deleteLock.current || !screen.active || !isSessionCurrent(requestRevision)) return
    // deleteLock.current = true
//
    // setIsDeleting(true)
    // try {
      // await deleteSupplierByID(selectedSupplier.SupplierID)
      // if (!screen.active || !isSessionCurrent(requestRevision)) return
      // setSuppliersResponse((previous) => previous ? {
        // ...previous,
        // data: previous.data.filter((supplier) => supplier.SupplierID !== selectedSupplier.SupplierID),
        // totalCount: Math.max(0, previous.totalCount - 1),
        // totalPages: Math.ceil(Math.max(0, previous.totalCount - 1) / PAGE_SIZE),
      // } : null)
      // clearSelection()
      // toast.add({ type: 'success', title: 'Proveedor eliminado', description: `Se eliminó el proveedor ${selectedSupplier.NombreProveedor}.` })
      // setIsLoading(true)
//
      // if (suppliers.length === 1 && pageNumber > 1) {
        // setPageNumber(pageNumber - 1)
      // } else {
        // setRefreshKey((key) => key + 1)
      // }
    // } catch (reason) {
      // if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); return }
      // if (!screen.active || !isSessionCurrent(requestRevision)) return
      // setIsConfirmingDelete(false)
      // toast.add({
        // type: 'error',
        // title: 'No se pudo eliminar el proveedor',
        // description: reason instanceof TypeError ? 'No fue posible confirmar la eliminación. Compruebe el resultado antes de repetirla.' : supplierError(reason),
        // priority: 'high',
        // timeout: 8000,
      // })
    // } finally {
      // deleteLock.current = false
      // if (screen.active && isSessionCurrent(requestRevision)) setIsDeleting(false)
    // }
  // }

  const activeFilters = [filters.supplierName.trim() !== '', filters.supplierCategoryID !== null, filters.deliveryMethodID !== null].filter(Boolean).length
  /** Vuelve a consultar los proveedores y los catálogos de los filtros. */
  const retryReads = () => { setRefreshKey(key => key + 1); setCatalogRefresh(key => key + 1) }
  const catalogMessages = [catalogErrors.categories && `Categorías: ${catalogErrors.categories}`, catalogErrors.methods && `Métodos de entrega: ${catalogErrors.methods}`].filter((message): message is string => Boolean(message))

  return (
    <main className="flex min-w-0 flex-1 bg-muted/40">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-24 sm:px-8 sm:pt-8 lg:pb-8">
        <PageHeader icon={TruckIcon} title="Proveedores" subtitle={`${totalCount} ${totalCount === 1 ? 'proveedor' : 'proveedores'}${activeFilters > 0 ? ' con los filtros aplicados' : ' registrados'}`} />
        {/* action={<NewButton href="/suppliers/new" label="Nuevo proveedor" />} */}

        <ReadErrorsBanner messages={catalogMessages} onRetry={retryReads} disabled={isLoading || catalogLoading} />

        <FilterCard activeFilters={activeFilters} onSubmit={handleSubmit} onReset={resetFilters} className="grid gap-4 md:grid-cols-2 md:items-end lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <SearchField id="supplierName" label="Nombre del proveedor" placeholder="Buscar por nombre" value={supplierName} onChange={setSupplierName} />
          <FilterSelect id="supplierCategory" label="Categoría" allLabel="Todas las categorías" value={supplierCategoryID} onChange={setSupplierCategoryID} disabled={Boolean(catalogErrors.categories)}
            options={categories.map(category => ({ value: category.SupplierCategoryID, label: category.NombreCategoriaProveedor }))} />
          <FilterSelect id="supplierDeliveryMethod" label="Método de entrega" allLabel="Todos los métodos" value={deliveryMethodID} onChange={setDeliveryMethodID} disabled={Boolean(catalogErrors.methods)}
            options={deliveryMethods.map(method => ({ value: method.DeliveryMethodID, label: method.NombreMetodoEntrega }))} />
        </FilterCard>

        <ListCard title="Listado de proveedores" loadingMore={isLoading && suppliers.length > 0} pageNumber={pageNumber} totalPages={totalPages}>
          {/* <SelectionBar selectedName={selectedSupplier?.NombreProveedor ?? null} hint="Marque la casilla de un proveedor para eliminarlo." noun="proveedor" onClear={clearSelection}
            confirming={isConfirmingDelete} onConfirmingChange={setIsConfirmingDelete} deleting={isDeleting} disabled={!selectedSupplier || isLoading} onDelete={() => void handleDeleteSupplier()} /> */}

          <div className="min-h-[20rem] md:min-h-[30rem]" aria-busy={isLoading}>
            {isLoading && suppliers.length === 0 && <TableSkeleton label="Cargando proveedores..." />}
            {!isLoading && error && <ErrorState message={error} onRetry={retryReads} disabled={isLoading || catalogLoading} />}
            {!isLoading && !error && suppliers.length === 0 && <EmptyState message="No se encontraron proveedores con los filtros seleccionados." onReset={activeFilters > 0 ? resetFilters : undefined} />}

            {!error && suppliers.length > 0 && (
              <>
                <ul className="divide-y md:hidden">
                  {suppliers.map((supplier) => (
                    <li key={supplier.SupplierID} className="flex gap-3 px-4 py-4">
                      {/* <Checkbox id={`supplier-mobile-${supplier.SupplierID}`} aria-label={`Seleccionar a ${supplier.NombreProveedor}`} checked={selectedSupplierID === supplier.SupplierID} disabled={isLoading || isDeleting} onCheckedChange={() => toggleSupplier(supplier.SupplierID)} className="mt-2.5" /> */}
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-start gap-3">
                          <EntityAvatar name={supplier.NombreProveedor} />
                          <div className="min-w-0 flex-1">
                            <Link href={`/suppliers/${supplier.SupplierID}`} className="block break-words font-medium hover:underline">{supplier.NombreProveedor}</Link>
                            <p className="text-xs text-muted-foreground tabular-nums">#{supplier.SupplierID}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary">{supplier.NombreCategoriaProveedor}</Badge>
                          <Badge variant="outline" className={supplier.NombreMetodoEntrega ? undefined : 'text-muted-foreground'}><TruckIcon aria-hidden="true" />{supplier.NombreMetodoEntrega ?? 'No asignado'}</Badge>
                        </div>
                      </div>
                      <RowMenu detailHref={`/suppliers/${supplier.SupplierID}`} name={supplier.NombreProveedor} />
                    </li>
                  ))}
                </ul>

                <div className="hidden md:block">
                  <Table className="min-w-[700px] table-fixed">
                    <colgroup><col /><col className="w-[22%]" /><col className="w-[22%]" /><col className="w-36" /></colgroup>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent">
                        {/* <TableHead className="text-center"><span className="sr-only">Seleccionar</span></TableHead> */}
                        <TableHead className={HEAD_CLASS}>Proveedor</TableHead>
                        <TableHead className={HEAD_CLASS}>Categoría</TableHead>
                        <TableHead className={HEAD_CLASS}>Método de entrega</TableHead>
                        <TableHead className={`text-right ${HEAD_CLASS}`}>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((supplier) => (
                        <TableRow key={supplier.SupplierID}>
                          {/* <TableCell className="p-0">
                            <label className="flex min-h-14 cursor-pointer items-center justify-center" htmlFor={`supplier-desktop-${supplier.SupplierID}`}>
                              <Checkbox id={`supplier-desktop-${supplier.SupplierID}`} aria-label={`Seleccionar a ${supplier.NombreProveedor}`} checked={selectedSupplierID === supplier.SupplierID} disabled={isLoading || isDeleting} onCheckedChange={() => toggleSupplier(supplier.SupplierID)} />
                            </label>
                          </TableCell> */}
                          <TableCell>
                            <div className="flex min-w-0 items-center gap-3">
                              <EntityAvatar name={supplier.NombreProveedor} />
                              <div className="min-w-0">
                                <Link href={`/suppliers/${supplier.SupplierID}`} className="block truncate font-medium hover:underline" title={supplier.NombreProveedor}>{supplier.NombreProveedor}</Link>
                                <p className="text-xs text-muted-foreground tabular-nums">#{supplier.SupplierID}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary" className="max-w-full" title={supplier.NombreCategoriaProveedor}><span className="truncate">{supplier.NombreCategoriaProveedor}</span></Badge></TableCell>
                          <TableCell>
                            {supplier.NombreMetodoEntrega
                              ? <Badge variant="outline" className="max-w-full" title={supplier.NombreMetodoEntrega}><TruckIcon aria-hidden="true" /><span className="truncate">{supplier.NombreMetodoEntrega}</span></Badge>
                              : <span className="text-sm text-muted-foreground italic">No asignado</span>}
                          </TableCell>
                          <TableCell><RowActions detailHref={`/suppliers/${supplier.SupplierID}`} name={supplier.NombreProveedor} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>

          <ListPagination inputId="supplierPageNumber" noun="proveedores" pageNumber={pageNumber} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} shown={suppliers.length} disabled={isLoading} onChange={changePage} onSubmit={handlePageSubmit} />
        </ListCard>
      </section>
    </main>
  )
}
