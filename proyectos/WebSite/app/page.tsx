'use client'

import type { SubmitEvent } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TruckIcon, UsersIcon } from 'lucide-react'
import { EmptyState, EntityAvatar, ErrorState, FilterCard, FilterSelect, HEAD_CLASS, ListCard, ListPagination, PageHeader, ReadErrorsBanner, RowActions, RowMenu, SearchField, TableSkeleton } from '@/components/list-kit'
import { Badge } from '@/components/ui/badge'
// import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
// import { toast } from '@/components/ui/toast'
import { getDeliveryMethods } from '@/app/api/application'
import { getCustomerCategories, getCustomers } from '@/app/api/customers'
import { useSession } from '@/components/auth-session'
import type { CustomerCategory, CustomerFilters, CustomersResponse } from '@/lib/types/customers'
import type { DeliveryMethod } from '@/lib/types/deliveryMethods'

const PAGE_SIZE = 10

const initialFilters: CustomerFilters = {
  customerName: '',
  customerCategoryID: null,
  deliveryMethodID: null,
}

/**
 * Obtiene el estado HTTP conservado en la causa del error de una lectura.
 *
 * @param error Error producido por un servicio del API.
 * @returns Código HTTP cuando existe o null para errores locales/red.
 */
function readHttpStatus(error: unknown): number | null {
  return error instanceof Error && typeof error.cause === 'number' ? error.cause : null
}

/**
 * Prepara un mensaje de lectura que no expone fallos internos del navegador/API.
 *
 * @param error Error ocurrido al consultar un recurso.
 * @param fallback Mensaje general correspondiente al recurso.
 * @param denied Mensaje específico para una respuesta 403.
 * @returns Mensaje seguro para la interfaz.
 */
function readErrorMessage(error: unknown, fallback: string, denied: string): string {
  const status = readHttpStatus(error)
  if (status === 403) return denied
  if (status !== null && status >= 500) {
    if (status === 503 && error instanceof Error) return error.message
    return `${fallback}. Intente nuevamente.`
  }
  if (error instanceof Error && (error.name === 'TypeError' || error.name === 'SyntaxError')) {
    return `${fallback}. Intente nuevamente.`
  }
  return error instanceof Error ? error.message : fallback
}

export default function Home() {
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const [customerName, setCustomerName] = useState('')
  const [customerCategoryID, setCustomerCategoryID] = useState<CustomerFilters['customerCategoryID']>(null)
  const [deliveryMethodID, setDeliveryMethodID] = useState<CustomerFilters['deliveryMethodID']>(null)
  const [filters, setFilters] = useState<CustomerFilters>(initialFilters)
  const [pageNumber, setPageNumber] = useState(1)
  const [customersResponse, setCustomersResponse] = useState<CustomersResponse | null>(null)
  const [categories, setCategories] = useState<CustomerCategory[]>([])
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([])
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [deliveryMethodsError, setDeliveryMethodsError] = useState<string | null>(null)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [deliveryMethodsLoading, setDeliveryMethodsLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // const [selectedCustomerID, setSelectedCustomerID] = useState<number | null>(null)
  // const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  // const [isDeleting, setIsDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0)
  // const deleteLock = useRef(false)
  // const lifetime = useRef({ active: false })
//
  // useEffect(() => {
    // const current = { active: true }
    // lifetime.current = current
    // return () => { current.active = false }
  // }, [])

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision

    async function loadData() {
      setIsLoading(true)
      setError(null)
      try {
        const customersData = await getCustomers(filters.customerName, filters.customerCategoryID, filters.deliveryMethodID, pageNumber, PAGE_SIZE)
        if (!cancelled && isSessionCurrent(requestRevision)) {
          setCustomersResponse(customersData)
          setError(null)
        }
      } catch (reason) {
        if (readHttpStatus(reason) === 401) {
          invalidateSession(requestRevision)
          return
        }
        if (cancelled || !isSessionCurrent(requestRevision)) return
        setCustomersResponse(null)
        setError(readErrorMessage(reason, 'No fue posible obtener los datos de clientes', 'Sin permisos para consultar los clientes.'))
      } finally {
        if (!cancelled && isSessionCurrent(requestRevision)) setIsLoading(false)
      }
    }

    queueMicrotask(() => {
      if (cancelled) return
      if (!isSessionCurrent(requestRevision)) {
        setCustomersResponse(null)
        setError(null)
        setIsLoading(false)
        return
      }
      void loadData()
    })
    return () => { cancelled = true }
  }, [filters, pageNumber, refreshKey, revision, isSessionCurrent, invalidateSession])

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision

    async function loadCategories() {
      try {
        const result = await getCustomerCategories()
        if (!cancelled && isSessionCurrent(requestRevision)) {
          setCategories(result)
          setCategoriesError(null)
        }
      } catch (reason) {
        if (readHttpStatus(reason) === 401) {
          invalidateSession(requestRevision)
          return
        }
        if (cancelled || !isSessionCurrent(requestRevision)) return
        setCategories([])
        setCategoriesError(readErrorMessage(reason, 'No fue posible obtener las categorías de clientes', 'Sin permisos para consultar las categorías de clientes.'))
      } finally {
        if (!cancelled && isSessionCurrent(requestRevision)) setCategoriesLoading(false)
      }
    }

    async function loadDeliveryMethods() {
      try {
        const result = await getDeliveryMethods()
        if (!cancelled && isSessionCurrent(requestRevision)) {
          setDeliveryMethods(result)
          setDeliveryMethodsError(null)
        }
      } catch (reason) {
        if (readHttpStatus(reason) === 401) {
          invalidateSession(requestRevision)
          return
        }
        if (cancelled || !isSessionCurrent(requestRevision)) return
        setDeliveryMethods([])
        setDeliveryMethodsError(readErrorMessage(reason, 'No fue posible obtener los métodos de entrega', 'Sin permisos para consultar los métodos de entrega.'))
      } finally {
        if (!cancelled && isSessionCurrent(requestRevision)) setDeliveryMethodsLoading(false)
      }
    }

    queueMicrotask(() => {
      if (cancelled) return
      if (!isSessionCurrent(requestRevision)) {
        setCategories([])
        setDeliveryMethods([])
        setCategoriesError(null)
        setDeliveryMethodsError(null)
        setCategoriesLoading(false)
        setDeliveryMethodsLoading(false)
        return
      }
      setCategoriesLoading(true)
      setDeliveryMethodsLoading(true)
      void loadCategories()
      void loadDeliveryMethods()
    })
    return () => { cancelled = true }
  }, [catalogRefreshKey, revision, isSessionCurrent, invalidateSession])

  /** Vuelve a solicitar listado y catálogos solo por acción expresa del usuario. */
  function retryReads() {
    setRefreshKey((key) => key + 1)
    setCatalogRefreshKey((key) => key + 1)
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilters({ customerName, customerCategoryID, deliveryMethodID })
    setPageNumber(1)
  }

  function resetFilters() {
    setCustomerName('')
    setCustomerCategoryID(null)
    setDeliveryMethodID(null)
    setFilters(initialFilters)
    setPageNumber(1)
  }

  const customers = customersResponse?.data ?? []
  const totalPages = customersResponse?.totalPages ?? 0
  const totalCount = customersResponse?.totalCount ?? 0
  // const selectedCustomer = customers.find((customer) => customer.CustomerID === selectedCustomerID) ?? null
  const hasReadError = Boolean(error || categoriesError || deliveryMethodsError)

  // function clearSelection() {
    // setSelectedCustomerID(null)
    // setIsConfirmingDelete(false)
  // }
//
  // function toggleCustomer(customerID: number) {
    // if (isLoading || isDeleting) return
    // if (selectedCustomerID === customerID) {
      // clearSelection()
      // return
    // }
    // setSelectedCustomerID(customerID)
    // setIsConfirmingDelete(false)
  // }

  function changePage(page: number) {
    setPageNumber(page)
  }

  function handlePageSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const page = Number(new FormData(event.currentTarget).get('pageNumber'))
    if (!isLoading && Number.isInteger(page) && page >= 1 && page <= totalPages) {
      changePage(page)
    }
  }

  // /** Confirma una sola eliminación y solo publica su resultado en la pantalla vigente. */
  // async function handleDeleteCustomer() {
    // const requestRevision = revision
    // const screen = lifetime.current
    // if (!selectedCustomer || !isConfirmingDelete || isLoading || isDeleting || deleteLock.current || !screen.active || !isSessionCurrent(requestRevision)) return
    // const target = selectedCustomer
//
    // deleteLock.current = true
    // setIsDeleting(true)
    // try {
      // await deleteCustomerByID(target.CustomerID)
      // if (!screen.active || !isSessionCurrent(requestRevision)) return
      // setCustomersResponse((previous) => previous ? {
        // ...previous,
        // data: previous.data.filter((customer) => customer.CustomerID !== target.CustomerID),
        // totalCount: Math.max(0, previous.totalCount - 1),
        // totalPages: Math.ceil(Math.max(0, previous.totalCount - 1) / PAGE_SIZE),
      // } : null)
      // setSelectedCustomerID(null)
      // setIsConfirmingDelete(false)
      // toast.add({ type: 'success', title: 'Cliente eliminado', description: `Se eliminó el cliente ${target.NombreCliente}.` })
      // setIsLoading(true)
//
      // if (customers.length === 1 && pageNumber > 1) {
        // setPageNumber(pageNumber - 1)
      // } else {
        // setRefreshKey((key) => key + 1)
      // }
    // } catch (reason) {
      // const status = readHttpStatus(reason)
      // if (status === 401) {
        // invalidateSession(requestRevision)
        // return
      // }
      // if (!screen.active || !isSessionCurrent(requestRevision)) return
      // let message = reason instanceof Error ? reason.message : 'No fue posible eliminar el cliente.'
      // if (status === 403) message = 'Sin permisos para eliminar el cliente.'
      // else if (reason instanceof TypeError || reason instanceof SyntaxError || (status !== null && status >= 500 && status !== 503)) message = 'No fue posible confirmar la eliminación. Compruebe si el cliente aún existe antes de repetirla.'
      // setIsConfirmingDelete(false)
      // toast.add({
        // type: 'error',
        // title: 'No se pudo eliminar el cliente',
        // description: message,
        // priority: 'high',
        // timeout: 8000,
      // })
    // } finally {
      // deleteLock.current = false
      // if (screen.active && isSessionCurrent(requestRevision)) setIsDeleting(false)
    // }
  // }

  const activeFilters = [filters.customerName.trim() !== '', filters.customerCategoryID !== null, filters.deliveryMethodID !== null].filter(Boolean).length
  const catalogMessages = [categoriesError && `Categorías: ${categoriesError}`, deliveryMethodsError && `Métodos de entrega: ${deliveryMethodsError}`].filter((message): message is string => Boolean(message))

  return (
    <main className="flex min-w-0 flex-1 bg-muted/40">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-24 sm:px-8 sm:pt-8 lg:pb-8">
        <PageHeader icon={UsersIcon} title="Clientes" subtitle={`${totalCount} ${totalCount === 1 ? 'cliente' : 'clientes'}${activeFilters > 0 ? ' con los filtros aplicados' : ' registrados'}`} />
        {/* action={<NewButton href="/customers/new" label="Nuevo cliente" />} */}

        {hasReadError && <ReadErrorsBanner messages={catalogMessages.length ? catalogMessages : ['Hay lecturas que no se pudieron completar.']} onRetry={retryReads} disabled={isLoading || categoriesLoading || deliveryMethodsLoading} />}

        <FilterCard activeFilters={activeFilters} onSubmit={handleSubmit} onReset={resetFilters} className="grid gap-4 md:grid-cols-2 md:items-end lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <SearchField id="customerName" label="Nombre del cliente" placeholder="Buscar por nombre" value={customerName} onChange={setCustomerName} />
          <FilterSelect id="customerCategory" label="Categoría" allLabel="Todas las categorías" value={customerCategoryID} onChange={setCustomerCategoryID} disabled={categoriesLoading || Boolean(categoriesError)}
            options={categories.map(category => ({ value: category.CustomerCategoryID, label: category.NombreCategoria }))} />
          <FilterSelect id="deliveryMethod" label="Método de entrega" allLabel="Todos los métodos" value={deliveryMethodID} onChange={setDeliveryMethodID} disabled={deliveryMethodsLoading || Boolean(deliveryMethodsError)}
            options={deliveryMethods.map(method => ({ value: method.DeliveryMethodID, label: method.NombreMetodoEntrega }))} />
        </FilterCard>

        <ListCard title="Listado de clientes" loadingMore={isLoading && customers.length > 0} pageNumber={pageNumber} totalPages={totalPages}>
          {/* <SelectionBar selectedName={selectedCustomer?.NombreCliente ?? null} hint="Marque la casilla de un cliente para eliminarlo." noun="cliente" onClear={clearSelection}
            confirming={isConfirmingDelete} onConfirmingChange={setIsConfirmingDelete} deleting={isDeleting} disabled={!selectedCustomer || isLoading} onDelete={() => void handleDeleteCustomer()} /> */}

          <div className="min-h-[20rem] md:min-h-[30rem]" aria-busy={isLoading}>
            {isLoading && customers.length === 0 && <TableSkeleton label="Cargando clientes..." />}
            {!isLoading && error && <ErrorState message={error} onRetry={retryReads} disabled={isLoading || categoriesLoading || deliveryMethodsLoading} />}
            {!isLoading && !error && customers.length === 0 && <EmptyState message="No se encontraron clientes con los filtros seleccionados." onReset={activeFilters > 0 ? resetFilters : undefined} />}

            {!error && customers.length > 0 && (
              <>
                <ul className="divide-y md:hidden">
                  {customers.map((customer) => (
                    <li key={customer.CustomerID} className="flex gap-3 px-4 py-4">
                      {/* <Checkbox id={`customer-mobile-${customer.CustomerID}`} aria-label={`Seleccionar a ${customer.NombreCliente}`} checked={selectedCustomerID === customer.CustomerID} disabled={isLoading || isDeleting} onCheckedChange={() => toggleCustomer(customer.CustomerID)} className="mt-2.5" /> */}
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-start gap-3">
                          <EntityAvatar name={customer.NombreCliente} />
                          <div className="min-w-0 flex-1">
                            <Link href={`/customers/${customer.CustomerID}`} className="block break-words font-medium hover:underline">{customer.NombreCliente}</Link>
                            <p className="text-xs text-muted-foreground tabular-nums">#{customer.CustomerID}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary">{customer.NombreCategoriaCliente}</Badge>
                          <Badge variant="outline"><TruckIcon aria-hidden="true" />{customer.NombreMetodoEntrega}</Badge>
                        </div>
                      </div>
                      <RowMenu detailHref={`/customers/${customer.CustomerID}`} name={customer.NombreCliente} />
                    </li>
                  ))}
                </ul>

                <div className="hidden md:block">
                  <Table className="min-w-[700px] table-fixed">
                    <colgroup><col /><col className="w-[22%]" /><col className="w-[22%]" /><col className="w-36" /></colgroup>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent">
                        {/* <TableHead className="text-center"><span className="sr-only">Seleccionar</span></TableHead> */}
                        <TableHead className={HEAD_CLASS}>Cliente</TableHead>
                        <TableHead className={HEAD_CLASS}>Categoría</TableHead>
                        <TableHead className={HEAD_CLASS}>Método de entrega</TableHead>
                        <TableHead className={`text-right ${HEAD_CLASS}`}>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow key={customer.CustomerID}>
                          {/* <TableCell className="p-0">
                            <label className="flex min-h-14 cursor-pointer items-center justify-center" htmlFor={`customer-desktop-${customer.CustomerID}`}>
                              <Checkbox id={`customer-desktop-${customer.CustomerID}`} aria-label={`Seleccionar a ${customer.NombreCliente}`} checked={selectedCustomerID === customer.CustomerID} disabled={isLoading || isDeleting} onCheckedChange={() => toggleCustomer(customer.CustomerID)} />
                            </label>
                          </TableCell> */}
                          <TableCell>
                            <div className="flex min-w-0 items-center gap-3">
                              <EntityAvatar name={customer.NombreCliente} />
                              <div className="min-w-0">
                                <Link href={`/customers/${customer.CustomerID}`} className="block truncate font-medium hover:underline" title={customer.NombreCliente}>{customer.NombreCliente}</Link>
                                <p className="text-xs text-muted-foreground tabular-nums">#{customer.CustomerID}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary" className="max-w-full" title={customer.NombreCategoriaCliente}><span className="truncate">{customer.NombreCategoriaCliente}</span></Badge></TableCell>
                          <TableCell><Badge variant="outline" className="max-w-full" title={customer.NombreMetodoEntrega}><TruckIcon aria-hidden="true" /><span className="truncate">{customer.NombreMetodoEntrega}</span></Badge></TableCell>
                          <TableCell><RowActions detailHref={`/customers/${customer.CustomerID}`} name={customer.NombreCliente} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>

          <ListPagination inputId="pageNumber" noun="clientes" pageNumber={pageNumber} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} shown={customers.length} disabled={isLoading} onChange={changePage} onSubmit={handlePageSubmit} />
        </ListCard>
      </section>
    </main>
  )
}
