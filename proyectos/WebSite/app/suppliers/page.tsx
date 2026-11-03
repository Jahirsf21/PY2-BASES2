'use client'

import type { SubmitEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, RotateCcwIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { useSession } from '@/components/auth-session'
import { getDeliveryMethods } from '@/app/api/application'
import { deleteSupplierByID, getSupplierCategories, getSuppliers } from '@/app/api/suppliers'
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
  const [selectedSupplierID, setSelectedSupplierID] = useState<number | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [catalogRefresh, setCatalogRefresh] = useState(0)
  const [catalogErrors, setCatalogErrors] = useState<{ categories?: string; methods?: string }>({})
  const [catalogLoading, setCatalogLoading] = useState(false)
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
          setSelectedSupplierID(null)
          setIsConfirmingDelete(false)
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
          if (!Array.isArray(items)) throw new SyntaxError('Catálogo inesperado')
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

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDeleting) return
    clearSelection()
    setFilters({ supplierName, supplierCategoryID, deliveryMethodID })
    setPageNumber(1)
  }

  function resetFilters() {
    if (isDeleting) return
    clearSelection()
    setSupplierName('')
    setSupplierCategoryID(null)
    setDeliveryMethodID(null)
    setFilters(initialFilters)
    setPageNumber(1)
  }

  const suppliers = suppliersResponse?.data ?? []
  const totalPages = suppliersResponse?.totalPages ?? 0
  const totalCount = suppliersResponse?.totalCount ?? 0
  const selectedSupplier = suppliers.find((supplier) => supplier.SupplierID === selectedSupplierID) ?? null

  function clearSelection() {
    setSelectedSupplierID(null)
    setIsConfirmingDelete(false)
  }

  function toggleSupplier(supplierID: number) {
    if (isLoading || isDeleting) return
    if (selectedSupplierID === supplierID) {
      clearSelection()
      return
    }
    setSelectedSupplierID(supplierID)
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

  /** Elimina una sola vez y descarta efectos de otra pantalla o revisión de sesión. */
  async function handleDeleteSupplier() {
    const requestRevision = revision
    const screen = lifetime.current
    if (!selectedSupplier || !isConfirmingDelete || isLoading || isDeleting || deleteLock.current || !screen.active || !isSessionCurrent(requestRevision)) return
    deleteLock.current = true

    setIsDeleting(true)
    try {
      await deleteSupplierByID(selectedSupplier.SupplierID)
      if (!screen.active || !isSessionCurrent(requestRevision)) return
      setSuppliersResponse((previous) => previous ? {
        ...previous,
        data: previous.data.filter((supplier) => supplier.SupplierID !== selectedSupplier.SupplierID),
        totalCount: Math.max(0, previous.totalCount - 1),
        totalPages: Math.ceil(Math.max(0, previous.totalCount - 1) / PAGE_SIZE),
      } : null)
      clearSelection()
      toast.add({ type: 'success', title: 'Proveedor eliminado', description: `Se eliminó el proveedor ${selectedSupplier.NombreProveedor}.` })
      setIsLoading(true)

      if (suppliers.length === 1 && pageNumber > 1) {
        setPageNumber(pageNumber - 1)
      } else {
        setRefreshKey((key) => key + 1)
      }
    } catch (reason) {
      if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); return }
      if (!screen.active || !isSessionCurrent(requestRevision)) return
      setIsConfirmingDelete(false)
      toast.add({
        type: 'error',
        title: 'No se pudo eliminar el proveedor',
        description: reason instanceof TypeError ? 'No fue posible confirmar la eliminación. Compruebe el resultado antes de repetirla.' : supplierError(reason),
        priority: 'high',
        timeout: 8000,
      })
    } finally {
      deleteLock.current = false
      if (screen.active && isSessionCurrent(requestRevision)) setIsDeleting(false)
    }
  }

  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
            <p className="text-sm text-muted-foreground">{totalCount} {totalCount === 1 ? 'Proveedor' : 'Proveedores'}</p>
          </div>
          <Button nativeButton={false} render={<Link href="/suppliers/new" />}>
            <PlusIcon data-icon="inline-start" /> Nuevo proveedor
          </Button>
        </div>

        {(error || catalogErrors.categories || catalogErrors.methods) && (
          <div className="space-y-2 rounded-lg border bg-card p-4">
            {catalogErrors.categories && <p role="alert" className="text-sm text-destructive">Categorías: {catalogErrors.categories}</p>}
            {catalogErrors.methods && <p role="alert" className="text-sm text-destructive">Métodos de entrega: {catalogErrors.methods}</p>}
            <Button type="button" variant="outline" disabled={isLoading || catalogLoading || isDeleting} onClick={() => { setRefreshKey(key => key + 1); setCatalogRefresh(key => key + 1) }}>Reintentar lecturas</Button>
          </div>
        )}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <form className="grid gap-4 md:grid-cols-2 md:items-end lg:grid-cols-[minmax(0,1fr)_190px_190px_auto]" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="supplierName">Nombre del proveedor</Label>
              <Input
                id="supplierName"
                placeholder="Buscar por nombre"
                value={supplierName}
                disabled={isDeleting}
                onChange={(event) => setSupplierName(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supplierCategory">Categoría</Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  id="supplierCategory"
                  type="button"
                  disabled={isDeleting || Boolean(catalogErrors.categories)}
                  className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <span className="min-w-0 truncate">
                    {supplierCategoryID === null ? 'Todas las categorías' : categories.find((category) => category.SupplierCategoryID === supplierCategoryID)?.NombreCategoriaProveedor ?? 'Categoría seleccionada'}
                  </span>
                  <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-w-[calc(100vw-2rem)]">
                  <DropdownMenuRadioGroup value={supplierCategoryID === null ? '' : String(supplierCategoryID)} onValueChange={(value) => setSupplierCategoryID(value === '' ? null : Number(value))}>
                    <DropdownMenuRadioItem value="" disabled={isDeleting} closeOnClick>Todas las categorías</DropdownMenuRadioItem>
                    {categories.map((category) => (
                      <DropdownMenuRadioItem
                        key={category.SupplierCategoryID}
                        value={String(category.SupplierCategoryID)}
                        disabled={isDeleting}
                        closeOnClick
                      >
                        {category.NombreCategoriaProveedor}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supplierDeliveryMethod">Método de entrega</Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  id="supplierDeliveryMethod"
                  type="button"
                  disabled={isDeleting || Boolean(catalogErrors.methods)}
                  className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <span className="min-w-0 truncate">
                    {deliveryMethodID === null ? 'Todos los métodos' : deliveryMethods.find((method) => method.DeliveryMethodID === deliveryMethodID)?.NombreMetodoEntrega ?? 'Método seleccionado'}
                  </span>
                  <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-w-[calc(100vw-2rem)]">
                  <DropdownMenuRadioGroup value={deliveryMethodID === null ? '' : String(deliveryMethodID)} onValueChange={(value) => setDeliveryMethodID(value === '' ? null : Number(value))}>
                    <DropdownMenuRadioItem value="" disabled={isDeleting} closeOnClick>Todos los métodos</DropdownMenuRadioItem>
                    {deliveryMethods.map((method) => (
                      <DropdownMenuRadioItem
                        key={method.DeliveryMethodID}
                        value={String(method.DeliveryMethodID)}
                        disabled={isDeleting}
                        closeOnClick
                      >
                        {method.NombreMetodoEntrega}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
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
            <h2 className="font-medium">Listado de proveedores</h2>
            <span className="text-sm text-muted-foreground">
              {isLoading && suppliers.length > 0
                ? 'Actualizando...'
                : `Página ${pageNumber} de ${totalPages}`}
            </span>
          </div>

          <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 break-words text-sm text-muted-foreground" aria-live="polite">
              {selectedSupplier ? `Seleccionado: ${selectedSupplier.NombreProveedor}` : 'Seleccione un proveedor para eliminarlo.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedSupplier && (
                <Button type="button" variant="outline" disabled={isLoading || isDeleting} onClick={clearSelection}>
                  Quitar selección
                </Button>
              )}
              <AlertDialog open={isConfirmingDelete} onOpenChange={(open) => { if (!isDeleting) setIsConfirmingDelete(open) }}>
                <AlertDialogTrigger render={<Button variant="destructive" />} disabled={!selectedSupplier || isLoading || isDeleting}>
                  <Trash2Icon data-icon="inline-start" />
                  Eliminar proveedor
                </AlertDialogTrigger>
                <AlertDialogContent aria-busy={isDeleting}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar a {selectedSupplier?.NombreProveedor}?</AlertDialogTitle>
                    <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction type="button" variant="destructive" disabled={isDeleting || !selectedSupplier} onClick={() => void handleDeleteSupplier()}>
                      {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="min-h-[20rem] md:min-h-[26rem]" aria-busy={isLoading}>
            {isLoading && suppliers.length === 0 && (
              <p className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                Cargando proveedores...
              </p>
            )}

            {!isLoading && error && (
              <p className="flex h-32 items-center justify-center px-4 text-center text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            {!isLoading && !error && suppliers.length === 0 && (
              <p className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                No se encontraron proveedores con los filtros seleccionados.
              </p>
            )}

            {!error && suppliers.length > 0 && (
              <>
                <ul className="divide-y md:hidden">
                  {suppliers.map((supplier) => (
                    <li key={supplier.SupplierID} data-state={selectedSupplierID === supplier.SupplierID ? 'selected' : undefined} className="space-y-3 px-4 py-4 data-[state=selected]:bg-muted">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`supplier-mobile-${supplier.SupplierID}`}
                          checked={selectedSupplierID === supplier.SupplierID}
                          disabled={isLoading || isDeleting}
                          onCheckedChange={() => toggleSupplier(supplier.SupplierID)}
                          className="mt-0.5"
                        />
                        <label htmlFor={`supplier-mobile-${supplier.SupplierID}`} className="min-w-0 cursor-pointer break-words text-sm font-medium">
                          {supplier.NombreProveedor}
                        </label>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-4 text-sm">
                        <div className="min-w-0">
                          <dt className="text-xs text-muted-foreground">Categoría</dt>
                          <dd className="break-words">{supplier.NombreCategoriaProveedor}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-xs text-muted-foreground">Método de entrega</dt>
                          <dd className="break-words">{supplier.NombreMetodoEntrega ?? 'No asignado'}</dd>
                        </div>
                      </dl>
                      <div className="flex justify-end">
                        <Button
                          nativeButton={false}
                          render={<Link href={`/suppliers/${supplier.SupplierID}`} />}
                          variant="outline"
                          size="sm"
                        >
                          Ver detalle
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="hidden md:block">
                  <Table className="min-w-[720px] table-fixed">
                    <colgroup>
                      <col className="w-[12%]" />
                      <col className="w-[31%]" />
                      <col className="w-[20%]" />
                      <col className="w-[20%]" />
                      <col className="w-[17%]" />
                    </colgroup>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">Seleccionar</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Método de entrega</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((supplier) => (
                        <TableRow key={supplier.SupplierID} data-state={selectedSupplierID === supplier.SupplierID ? 'selected' : undefined}>
                          <TableCell className="p-0">
                            <label className="flex min-h-10 cursor-pointer items-center justify-center" htmlFor={`supplier-desktop-${supplier.SupplierID}`}>
                              <Checkbox
                                id={`supplier-desktop-${supplier.SupplierID}`}
                                aria-label={`Seleccionar a ${supplier.NombreProveedor}`}
                                checked={selectedSupplierID === supplier.SupplierID}
                                disabled={isLoading || isDeleting}
                                onCheckedChange={() => toggleSupplier(supplier.SupplierID)}
                              />
                            </label>
                          </TableCell>
                          <TableCell className="p-0">
                            <label htmlFor={`supplier-desktop-${supplier.SupplierID}`} className="block cursor-pointer truncate p-2" title={supplier.NombreProveedor}>
                              {supplier.NombreProveedor}
                            </label>
                          </TableCell>
                          <TableCell className="p-0">
                            <label htmlFor={`supplier-desktop-${supplier.SupplierID}`} className="block cursor-pointer truncate p-2" title={supplier.NombreCategoriaProveedor}>
                              {supplier.NombreCategoriaProveedor}
                            </label>
                          </TableCell>
                          <TableCell className="p-0">
                            <label htmlFor={`supplier-desktop-${supplier.SupplierID}`} className="block cursor-pointer truncate p-2" title={supplier.NombreMetodoEntrega ?? 'No asignado'}>
                              {supplier.NombreMetodoEntrega ?? 'No asignado'}
                            </label>
                          </TableCell>
                          <TableCell>
                            <Button
                              nativeButton={false}
                              render={<Link href={`/suppliers/${supplier.SupplierID}`} />}
                              variant="outline"
                              size="sm"
                            >
                              Ver detalle
                            </Button>
                          </TableCell>
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
              Mostrando {suppliers.length} de {totalCount} Proveedores
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
                <Label htmlFor="supplierPageNumber" className="sr-only">Número de página</Label>
                <Input
                  key={pageNumber}
                  id="supplierPageNumber"
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
