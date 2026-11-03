'use client'

import type { SubmitEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, ChevronDownIcon } from 'lucide-react'
import { createCustomer, getBillToCustomers, getBuyingGroups, getCustomerCategories, updateCustomerByID } from '@/app/api/customers'
import { getCities, getDeliveryMethods, getEmployees, getPeople } from '@/app/api/application'
import { LookupPicker, type LookupOption } from '@/app/customers/lookup-picker'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ui/toast'
import { useSession } from '@/components/auth-session'
import { checkId, validateCustomer } from '@/lib/helpers/entityValidation'
import type { NewCustomer, BuyingGroup, CustomerCategory, CustomerEdit } from '@/lib/types/customers'
import type { DeliveryMethod } from '@/lib/types/deliveryMethods'
import type { Employee } from '@/lib/types/application'

const LOOKUP_SIZE = 8
const catalogLabels = { categories: 'categorías de clientes', groups: 'grupos de compra', methods: 'métodos de entrega', employees: 'empleados' }
type CatalogKey = keyof typeof catalogLabels

/** Busca clientes por facturar conservando el tamaño de página del formulario. */
async function findBillTo(query: string, page: number) {
  const result = await getBillToCustomers(query, page, LOOKUP_SIZE)
  return { items: result.data.map((customer) => ({ id: customer.CustomerID, label: customer.NombreCliente })), totalPages: result.totalPages }
}

/** Busca contactos utilizando sus identificadores PersonID originales. */
async function findPeople(query: string, page: number) {
  const result = await getPeople(query, page, LOOKUP_SIZE)
  return { items: result.data.map((person) => ({ id: person.PersonID, label: person.NombreCompleto })), totalPages: result.totalPages }
}

/** Busca ciudades y conserva su etiqueta de ciudad, provincia y país. */
async function findCities(query: string, page: number) {
  const result = await getCities(query, page, LOOKUP_SIZE)
  return { items: result.data.map((city) => ({ id: city.CityID, label: `${city.NombreCiudad}, ${city.Provincia}, ${city.NombrePais}` })), totalPages: result.totalPages }
}

/** Presenta un campo sin cambiar los límites y validaciones existentes. */
function TextField({ label, name, required, ...props }: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={name}>{label}{required ? ' *' : ''}</Label>
      <Input id={name} name={name} required={required} {...props} />
    </div>
  )
}

const dropdownClass = 'flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

/** Presenta errores de lectura sin exponer detalles internos de red o JSON. */
function catalogMessage(reason: unknown, label: string): string {
  const status = reason instanceof Error ? reason.cause : null
  if (status === 403) return `Sin permisos para consultar ${label}.`
  if (reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503)) return `No fue posible cargar ${label}. Intente nuevamente.`
  return reason instanceof Error ? reason.message : `No fue posible cargar ${label}.`
}

/** Mantiene el formulario y sus operaciones dentro de la sesión que los originó. */
export function CustomerForm({ initial }: { initial?: CustomerEdit }) {
  const router = useRouter()
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const editing = Boolean(initial)
  const [categories, setCategories] = useState<CustomerCategory[]>([])
  const [groups, setGroups] = useState<BuyingGroup[]>([])
  const [methods, setMethods] = useState<DeliveryMethod[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [customerCategoryID, setCustomerCategoryID] = useState<number | null>(initial?.CustomerCategoryID ?? null)
  const [deliveryMethodID, setDeliveryMethodID] = useState<number | null>(initial?.DeliveryMethodID ?? null)
  const [buyingGroupID, setBuyingGroupID] = useState<number | null>(initial?.BuyingGroupID ?? null)
  const [lastEditedBy, setLastEditedBy] = useState<number | null>(initial?.LastEditedBy ?? null)
  const [catalogErrors, setCatalogErrors] = useState<Partial<Record<CatalogKey, string>>>({})
  const [catalogLoading, setCatalogLoading] = useState<Record<CatalogKey, boolean>>({ categories: true, groups: true, methods: true, employees: true })
  const [catalogRefresh, setCatalogRefresh] = useState(0)
  const [billTo, setBillTo] = useState<LookupOption | null>(initial && initial.BillToCustomerID !== initial.CustomerID ? { id: initial.BillToCustomerID, label: initial.NombreClientePorFacturar } : null)
  const [primaryContact, setPrimaryContact] = useState<LookupOption | null>(initial ? { id: initial.PrimaryContactPersonID, label: initial.NombreContactoPrincipal } : null)
  const [alternateContact, setAlternateContact] = useState<LookupOption | null>(initial?.AlternateContactPersonID ? { id: initial.AlternateContactPersonID, label: initial.NombreContactoAlternativo ?? '' } : null)
  const [deliveryCity, setDeliveryCity] = useState<LookupOption | null>(initial ? { id: initial.DeliveryCityID, label: initial.CiudadEntrega } : null)
  const [statementSent, setStatementSent] = useState(Boolean(initial?.EnviarEstadoCuenta))
  const [creditHold, setCreditHold] = useState(Boolean(initial?.CreditoSuspendido))
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<{ message: string; fields: [string, string][] } | null>(null)
  const submitLock = useRef(false)
  const lifetime = useRef({ active: false })
  const catalogsPending = Object.values(catalogLoading).some(Boolean)
  const catalogsFailed = Object.values(catalogErrors).some(Boolean)

  useEffect(() => {
    const current = { active: true }
    lifetime.current = current
    return () => { current.active = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision

    /** Cada catálogo procesa su propio 401, aunque otra lectura ya haya fallado. */
    async function loadCatalog<T>(key: CatalogKey, read: () => Promise<T[]>, apply: (items: T[]) => void, required = false) {
      if (!isSessionCurrent(requestRevision)) return
      try {
        const items = await read()
        if (cancelled || !isSessionCurrent(requestRevision)) return
        if (!Array.isArray(items)) throw new SyntaxError('Catálogo inesperado')
        if (required && items.length === 0) throw new Error(`No hay ${catalogLabels[key]} disponibles para completar el formulario.`)
        apply(items)
        setCatalogErrors(previous => ({ ...previous, [key]: undefined }))
      } catch (reason) {
        if (reason instanceof Error && reason.cause === 401) {
          invalidateSession(requestRevision)
          return
        }
        if (cancelled || !isSessionCurrent(requestRevision)) return
        setCatalogErrors(previous => ({ ...previous, [key]: catalogMessage(reason, catalogLabels[key]) }))
      } finally {
        if (!cancelled && isSessionCurrent(requestRevision)) setCatalogLoading(previous => ({ ...previous, [key]: false }))
      }
    }

    queueMicrotask(() => {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setCatalogLoading({ categories: true, groups: true, methods: true, employees: true })
      setCatalogErrors({})
      void loadCatalog('categories', getCustomerCategories, setCategories, true)
      void loadCatalog('groups', getBuyingGroups, setGroups)
      void loadCatalog('methods', getDeliveryMethods, setMethods, true)
      void loadCatalog('employees', getEmployees, items => {
        setEmployees(items)
        setLastEditedBy(selected => items.some(employee => employee.PersonID === selected) ? selected : null)
      }, true)
    })
    return () => { cancelled = true }
  }, [catalogRefresh, revision, isSessionCurrent, invalidateSession])

  /** Informa una validación local sin borrar el borrador. */
  function showValidationError(message: string) {
    toast.add({ type: 'error', title: 'Revise los datos del cliente', description: message, priority: 'high', timeout: 8000 })
  }

  /** Envía una sola mutación y descarta sus efectos si cambia pantalla o sesión. */
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const requestRevision = revision
    const screen = lifetime.current
    if (submitLock.current || submitting || !screen.active || !isSessionCurrent(requestRevision)) return
    if (catalogsPending || catalogsFailed) {
      showValidationError('Espere a que las opciones del formulario estén disponibles o reintente su carga.')
      return
    }
    if (customerCategoryID === null || deliveryMethodID === null || lastEditedBy === null || !employees.some((employee) => employee.PersonID === lastEditedBy)) {
      showValidationError('Seleccione la categoría, el método de entrega y un empleado válido que registre el cliente.')
      return
    }
    if (!primaryContact || !deliveryCity) {
      showValidationError('Seleccione el contacto principal y la ciudad de entrega.')
      return
    }

    const data = new FormData(event.currentTarget)
    const text = (name: string) => String(data.get(name) ?? '').trim()
    const optionalNumber = (name: string) => text(name) === '' ? null : Number(text(name))
    const latitude = optionalNumber('latitude')
    const longitude = optionalNumber('longitude')

    const customer: NewCustomer = {
      customerName: text('customerName'),
      customerCategoryID,
      billToCustomerID: billTo?.id ?? initial?.CustomerID ?? null,
      lastEditedBy,
      standardDiscountPercentage: Number(text('standardDiscountPercentage') || '0'),
      creditLimit: optionalNumber('creditLimit'),
      isStatementSent: statementSent,
      isOnCreditHold: creditHold,
      buyingGroupID,
      primaryContactPersonID: primaryContact.id,
      alternateContactPersonID: alternateContact?.id ?? null,
      deliveryMethodID,
      paymentDays: Number(text('paymentDays')),
      phoneNumber: text('phoneNumber'),
      faxNumber: text('faxNumber') || null,
      websiteURL: text('websiteURL') || null,
      deliveryAddressLine1: text('deliveryAddressLine1'),
      deliveryAddressLine2: text('deliveryAddressLine2') || null,
      deliveryCityID: deliveryCity.id,
      deliveryPostalCode: text('deliveryPostalCode'),
      postalAddressLine1: text('postalAddressLine1'),
      postalAddressLine2: text('postalAddressLine2') || null,
      latitude,
      longitude,
    }

    const { fields, errors } = validateCustomer(customer, editing)
    if (fields.length > 0) {
      showValidationError(errors[fields[0]])
      return
    }

    if (!isSessionCurrent(requestRevision)) return
    submitLock.current = true
    setSubmitting(true)
    setSubmitError(null)
    try {
      if (initial) {
        await updateCustomerByID(initial.CustomerID, customer)
        if (!screen.active || !isSessionCurrent(requestRevision)) return
        toast.add({ type: 'success', title: 'Cliente actualizado', description: `${customer.customerName} se actualizó correctamente.` })
        router.push(`/customers/${initial.CustomerID}`)
      } else {
        const id = await createCustomer(customer)
        if (!screen.active || !isSessionCurrent(requestRevision)) return
        const idErrors: Record<string, string> = {}
        checkId(idErrors, 'id', 'Cliente', id, true)
        if (idErrors.id) throw new SyntaxError('Identificador de creación inesperado')
        toast.add({ type: 'success', title: 'Cliente creado', description: `${customer.customerName} se creó correctamente.` })
        router.push(`/customers/${id}`)
      }
    } catch (reason) {
      const status = reason instanceof Error ? reason.cause : null
      if (status === 401) {
        invalidateSession(requestRevision)
        return
      }
      if (!screen.active || !isSessionCurrent(requestRevision)) return
      let message = reason instanceof Error ? reason.message : 'No fue posible guardar el cliente.'
      if (status === 403) message = 'Sin permisos para guardar el cliente.'
      else if (reason instanceof TypeError || reason instanceof SyntaxError) message = 'No fue posible confirmar el resultado del guardado. Compruebe si el cliente se guardó antes de volver a enviarlo.'
      else if (typeof status === 'number' && status >= 500 && status !== 503) message = 'No fue posible guardar el cliente. Compruebe el resultado antes de volver a enviarlo.'
      const fields: [string, string][] = []
      if (status === 400 && reason instanceof Error && 'errors' in reason && reason.errors !== null && typeof reason.errors === 'object') {
        for (const [field, text] of Object.entries(reason.errors)) {
          if (typeof text === 'string') fields.push([field, text])
        }
      }
      setSubmitError({ message, fields })
      toast.add({ type: 'error', title: editing ? 'No se pudo actualizar el cliente' : 'No se pudo crear el cliente', description: message, priority: 'high', timeout: 8000 })
      setSubmitting(false)
    } finally {
      submitLock.current = false
    }
  }

  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
        <Link href={initial ? `/customers/${initial.CustomerID}` : '/'} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeftIcon className="size-4" aria-hidden="true" /> {editing ? 'Volver al detalle' : 'Volver a clientes'}
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{editing ? 'Editar cliente' : 'Crear cliente'}</h1>
          <p className="text-sm text-muted-foreground">Complete los datos obligatorios marcados con *.</p>
        </div>
        {catalogsPending && <p role="status" className="text-sm text-muted-foreground">Cargando opciones del formulario...</p>}
        {catalogsFailed && (
          <div className="space-y-3 rounded-lg border border-destructive/30 bg-card p-4">
            <ul role="alert" className="space-y-1 text-sm text-destructive">
              {(Object.keys(catalogLabels) as CatalogKey[]).map(key => catalogErrors[key] && <li key={key}>{catalogErrors[key]}</li>)}
            </ul>
            <Button type="button" variant="outline" disabled={submitting || catalogsPending} onClick={() => setCatalogRefresh(value => value + 1)}>Reintentar opciones</Button>
          </div>
        )}
        {submitError && (
          <div role="alert" className="space-y-2 rounded-lg border border-destructive/30 bg-card p-4 text-sm text-destructive">
            <p>{submitError.message}</p>
            {submitError.fields.length > 0 && <ul>{submitError.fields.map(([field, message]) => <li key={field}>{field}: {message}</li>)}</ul>}
          </div>
        )}
        <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
          <fieldset disabled={submitting} className="space-y-6">
            <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Datos generales</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Nombre del cliente" name="customerName" maxLength={100} defaultValue={initial?.NombreCliente} required />
                <div className="grid gap-2">
                  <Label htmlFor="customerCategoryID">Categoría *</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger id="customerCategoryID" type="button" disabled={submitting || catalogLoading.categories || Boolean(catalogErrors.categories)} className={dropdownClass}>
                      <span className="min-w-0 truncate">{categories.find((category) => category.CustomerCategoryID === customerCategoryID)?.NombreCategoria ?? 'Seleccione una categoría'}</span>
                      <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-w-[calc(100vw-2rem)]">
                      <DropdownMenuRadioGroup value={customerCategoryID === null ? '' : String(customerCategoryID)} onValueChange={(value) => setCustomerCategoryID(Number(value))}>
                        {categories.map((category) => (
                          <DropdownMenuRadioItem key={category.CustomerCategoryID} value={String(category.CustomerCategoryID)} closeOnClick>{category.NombreCategoria}</DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deliveryMethodID">Método de entrega *</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger id="deliveryMethodID" type="button" disabled={submitting || catalogLoading.methods || Boolean(catalogErrors.methods)} className={dropdownClass}>
                      <span className="min-w-0 truncate">{methods.find((method) => method.DeliveryMethodID === deliveryMethodID)?.NombreMetodoEntrega ?? 'Seleccione un método'}</span>
                      <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-w-[calc(100vw-2rem)]">
                      <DropdownMenuRadioGroup value={deliveryMethodID === null ? '' : String(deliveryMethodID)} onValueChange={(value) => setDeliveryMethodID(Number(value))}>
                        {methods.map((method) => (
                          <DropdownMenuRadioItem key={method.DeliveryMethodID} value={String(method.DeliveryMethodID)} closeOnClick>{method.NombreMetodoEntrega}</DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="buyingGroupID">Grupo de compra</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger id="buyingGroupID" type="button" disabled={submitting || catalogLoading.groups || Boolean(catalogErrors.groups)} className={dropdownClass}>
                      <span className="min-w-0 truncate">{groups.find((group) => group.BuyingGroupID === buyingGroupID)?.NombreGrupoCompra ?? (buyingGroupID === null ? 'Sin grupo' : 'Grupo seleccionado')}</span>
                      <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-w-[calc(100vw-2rem)]">
                      <DropdownMenuRadioGroup value={buyingGroupID === null ? '' : String(buyingGroupID)} onValueChange={(value) => setBuyingGroupID(value === '' ? null : Number(value))}>
                        <DropdownMenuRadioItem value="" closeOnClick>Sin grupo</DropdownMenuRadioItem>
                        {groups.map((group) => (
                          <DropdownMenuRadioItem key={group.BuyingGroupID} value={String(group.BuyingGroupID)} closeOnClick>{group.NombreGrupoCompra}</DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <TextField label="Días para pagar" name="paymentDays" type="number" min={0} step={1} defaultValue={initial?.DiasGraciaPago} required />
                <div className="grid gap-2">
                   <Label htmlFor="lastEditedBy">{editing ? 'Empleado a cargo de la actualización *' : 'Empleado que registra *'}</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger id="lastEditedBy" type="button" disabled={submitting || catalogLoading.employees || Boolean(catalogErrors.employees)} className={dropdownClass}>
                      <span className="min-w-0 truncate">{employees.find((employee) => employee.PersonID === lastEditedBy)?.NombreCompleto ?? 'Seleccione un empleado'}</span>
                      <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-w-[calc(100vw-2rem)] overflow-hidden p-0">
                      <ScrollArea className="h-48 max-h-(--available-height)">
                        <DropdownMenuRadioGroup value={lastEditedBy === null ? '' : String(lastEditedBy)} onValueChange={(value) => setLastEditedBy(Number(value))} className="p-1">
                          {employees.map((employee) => (
                            <DropdownMenuRadioItem key={employee.PersonID} value={String(employee.PersonID)} closeOnClick>{employee.NombreCompleto}</DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <TextField label="Descuento estándar (%)" name="standardDiscountPercentage" type="number" min={0} max={100} step="0.001" defaultValue={initial?.PorcentajeDescuentoEstandar ?? 0} />
                <TextField label="Límite de crédito" name="creditLimit" type="number" min={0} step="0.01" defaultValue={initial?.LimiteCredito ?? ''} />
                <TextField label="Teléfono" name="phoneNumber" maxLength={20} defaultValue={initial?.Telefono} required />
                <TextField label="Fax" name="faxNumber" maxLength={20} defaultValue={initial?.Fax ?? ''} />
                <TextField label="Sitio web" name="websiteURL" type="url" maxLength={256} placeholder="https://ejemplo.com" defaultValue={initial?.SitioWeb ?? ''} />
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={statementSent} disabled={submitting} onCheckedChange={setStatementSent} /> Enviar estados de cuenta</label>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={creditHold} disabled={submitting} onCheckedChange={setCreditHold} /> Crédito suspendido</label>
              </div>
            </section>

            <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Facturación y contactos</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <LookupPicker id="billTo" label="Cliente por facturar" value={billTo} onChange={setBillTo} search={findBillTo} disabled={submitting} sessionAware />
                  <p className="text-xs text-muted-foreground">Si no selecciona otro cliente, {editing ? 'este cliente' : 'el nuevo cliente'} se factura a sí mismo.</p>
                </div>
                <LookupPicker id="primaryContact" label="Contacto principal" value={primaryContact} onChange={setPrimaryContact} search={findPeople} disabled={submitting} required sessionAware />
                <LookupPicker id="alternateContact" label="Contacto alternativo" value={alternateContact} onChange={setAlternateContact} search={findPeople} disabled={submitting} sessionAware />
              </div>
            </section>

            <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Direcciones</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-medium">Entrega</h3>
                  <TextField label="Dirección, línea 1" name="deliveryAddressLine1" maxLength={60} defaultValue={initial?.DireccionEntrega1} required />
                  <TextField label="Dirección, línea 2" name="deliveryAddressLine2" maxLength={60} defaultValue={initial?.DireccionEntrega2 ?? ''} />
                  <LookupPicker id="deliveryCity" label="Ciudad de entrega" value={deliveryCity} onChange={setDeliveryCity} search={findCities} disabled={submitting} required sessionAware />
                  <TextField label="Código postal" name="deliveryPostalCode" maxLength={10} defaultValue={initial?.CodigoPostalEntrega} required />
                </div>
                <div className="space-y-4">
                  <h3 className="font-medium">Postal</h3>
                  <TextField label="Dirección, línea 1" name="postalAddressLine1" maxLength={60} defaultValue={initial?.DireccionPostal1} required />
                  <TextField label="Dirección, línea 2" name="postalAddressLine2" maxLength={60} defaultValue={initial?.DireccionPostal2 ?? ''} />
                  <p className="text-sm text-muted-foreground">La ciudad y el código postal serán los mismos que en la dirección de entrega.</p>
                </div>
              </div>
              <h3 className="font-medium">Ubicación de entrega (opcional)</h3>
              <p className="text-sm text-muted-foreground">Si proporciona coordenadas, indique ambas.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Latitud" name="latitude" type="number" min={-90} max={90} step="any" defaultValue={initial?.Latitud ?? ''} />
                <TextField label="Longitud" name="longitude" type="number" min={-180} max={180} step="any" defaultValue={initial?.Longitud ?? ''} />
              </div>
            </section>
            <div className="flex flex-wrap justify-end gap-2">
              <Button nativeButton={false} render={<Link href={initial ? `/customers/${initial.CustomerID}` : '/'} />} variant="outline">Cancelar</Button>
              <Button type="submit" disabled={submitting || catalogsPending || catalogsFailed}>{submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear cliente'}</Button>
            </div>
          </fieldset>
        </form>
      </div>
    </main>
  )
}
