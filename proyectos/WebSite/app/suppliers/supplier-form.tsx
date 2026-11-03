'use client'

import type { SubmitEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, ChevronDownIcon } from 'lucide-react'
import { getCities, getDeliveryMethods, getEmployees, getPeople } from '@/app/api/application'
import { createSupplier, getSupplierCategories, updateSupplierByID } from '@/app/api/suppliers'
import { LookupPicker, type LookupOption } from '@/app/customers/lookup-picker'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ui/toast'
import { checkId, validateSupplier } from '@/lib/helpers/entityValidation'
import { useSession } from '@/components/auth-session'
import type { Employee } from '@/lib/types/application'
import type { DeliveryMethod } from '@/lib/types/deliveryMethods'
import type { NewSupplier, SupplierCategory, SupplierEdit } from '@/lib/types/suppliers'

const LOOKUP_SIZE = 8
const dropdownClass = 'flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

async function findPeople(query: string, page: number) {
  const result = await getPeople(query, page, LOOKUP_SIZE)
  return { items: result.data.map((person) => ({ id: person.PersonID, label: person.NombreCompleto })), totalPages: result.totalPages }
}

async function findCities(query: string, page: number) {
  const result = await getCities(query, page, LOOKUP_SIZE)
  return { items: result.data.map((city) => ({ id: city.CityID, label: `${city.NombreCiudad}, ${city.Provincia}, ${city.NombrePais}` })), totalPages: result.totalPages }
}

function TextField({ label, name, required, ...props }: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return <div className="grid min-w-0 gap-2"><Label htmlFor={name}>{label}{required ? ' *' : ''}</Label><Input id={name} name={name} required={required} {...props} /></div>
}

/** Conserva errores de negocio sin exponer detalles internos del transporte. */
function supplierFormError(reason: unknown): string {
  const status = reason instanceof Error ? reason.cause : null
  if (status === 403) return 'Sin permisos para realizar esta operación de proveedores.'
  if (reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503)) return 'No fue posible completar la operación. Compruebe el resultado antes de repetirla.'
  return reason instanceof Error ? reason.message : 'No fue posible completar la operación.'
}

export function SupplierForm({ initial }: { initial?: SupplierEdit }) {
  const router = useRouter()
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const [categories, setCategories] = useState<SupplierCategory[]>([])
  const [methods, setMethods] = useState<DeliveryMethod[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [categoryID, setCategoryID] = useState<number | null>(initial?.SupplierCategoryID ?? null)
  const [methodID, setMethodID] = useState<number | null>(initial?.DeliveryMethodID ?? null)
  const [lastEditedBy, setLastEditedBy] = useState<number | null>(initial?.LastEditedBy ?? null)
  const [primaryContact, setPrimaryContact] = useState<LookupOption | null>(initial ? { id: initial.PrimaryContactPersonID, label: initial.NombreContactoPrincipal } : null)
  const [alternateContact, setAlternateContact] = useState<LookupOption | null>(initial ? { id: initial.AlternateContactPersonID, label: initial.NombreContactoAlternativo } : null)
  const [deliveryCity, setDeliveryCity] = useState<LookupOption | null>(initial ? { id: initial.DeliveryCityID, label: initial.CiudadEntrega } : null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogRefresh, setCatalogRefresh] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const submitLock = useRef(false)
  const lifetime = useRef({ active: false })
  const back = initial ? `/suppliers/${initial.SupplierID}` : '/suppliers'

  useEffect(() => {
    const screen = { active: true }
    lifetime.current = screen
    return () => { screen.active = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision
    /** Identifica el catálogo fallido y no pierde un 401 paralelo o tardío. */
    function catalog<T>(request: Promise<T[]>, label: string): Promise<T[]> {
      return request.then(items => {
        if (!Array.isArray(items)) throw new SyntaxError('Catálogo inesperado')
        if (!items.length) throw new Error(`No hay ${label} disponibles.`)
        return items
      }).catch(reason => {
        if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); throw reason }
        throw new Error(`${label}: ${supplierFormError(reason)}`)
      })
    }
    queueMicrotask(() => {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setCatalogLoading(true)
      setCatalogError(null)
      Promise.all([catalog(getSupplierCategories(), 'categorías'), catalog(getDeliveryMethods(), 'métodos de entrega'), catalog(getEmployees(), 'empleados')])
      .then(([supplierCategories, deliveryMethods, employeeList]) => {
        if (!cancelled && isSessionCurrent(requestRevision)) {
          setCategories(supplierCategories)
          setMethods(deliveryMethods)
          setEmployees(employeeList)
          setLastEditedBy((selected) => employeeList.some((employee) => employee.PersonID === selected) ? selected : null)
        }
      })
      .catch(reason => {
        if (cancelled || !isSessionCurrent(requestRevision)) return
        setCatalogError(supplierFormError(reason))
      })
      .finally(() => { if (!cancelled && isSessionCurrent(requestRevision)) setCatalogLoading(false) })
    })
    return () => { cancelled = true }
  }, [catalogRefresh, revision, isSessionCurrent, invalidateSession])

  function showValidationError(message: string) {
    toast.add({ type: 'error', title: 'Revise los datos del proveedor', description: message, priority: 'high', timeout: 8000 })
  }

  /** Mantiene el envío único y sus efectos dentro de la pantalla y sesión iniciadoras. */
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const requestRevision = revision
    const screen = lifetime.current
    if (submitting || submitLock.current || catalogLoading || catalogError || !screen.active || !isSessionCurrent(requestRevision)) return
    if (categoryID === null || methodID === null || lastEditedBy === null || !employees.some((employee) => employee.PersonID === lastEditedBy)) {
      showValidationError('Seleccione la categoría, el método de entrega y un empleado válido que registre el proveedor.')
      return
    }
    if (!primaryContact || !alternateContact || !deliveryCity) {
      showValidationError('Seleccione ambos contactos y la ciudad de entrega.')
      return
    }
    const data = new FormData(event.currentTarget)
    const text = (name: string) => String(data.get(name) ?? '').trim()
    const optionalNumber = (name: string) => text(name) === '' ? null : Number(text(name))
    const optionalText = (name: string) => text(name) || null
    const latitude = optionalNumber('latitude')
    const longitude = optionalNumber('longitude')
    const supplier: NewSupplier = {
      supplierName: text('supplierName'), supplierCategoryID: categoryID, lastEditedBy,
      supplierReference: optionalText('supplierReference'),
      primaryContactPersonID: primaryContact.id, alternateContactPersonID: alternateContact.id,
      deliveryMethodID: methodID, paymentDays: Number(text('paymentDays')),
      phoneNumber: text('phoneNumber'), faxNumber: optionalText('faxNumber'), websiteURL: optionalText('websiteURL'),
      bankAccountName: optionalText('bankAccountName'), bankAccountBranch: optionalText('bankAccountBranch'),
      bankAccountCode: optionalText('bankAccountCode'), bankAccountNumber: optionalText('bankAccountNumber'),
      bankInternationalCode: optionalText('bankInternationalCode'),
      deliveryAddressLine1: text('deliveryAddressLine1'), deliveryAddressLine2: optionalText('deliveryAddressLine2'),
      deliveryCityID: deliveryCity.id, deliveryPostalCode: text('deliveryPostalCode'),
      postalAddressLine1: text('postalAddressLine1'), postalAddressLine2: optionalText('postalAddressLine2'),
      internalComments: optionalText('internalComments'), latitude, longitude,
    }
    const { fields, errors } = validateSupplier(supplier)
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
        await updateSupplierByID(initial.SupplierID, supplier)
        if (!screen.active || !isSessionCurrent(requestRevision)) return
        toast.add({ type: 'success', title: 'Proveedor actualizado', description: `${supplier.supplierName} se actualizó correctamente.` })
        router.push(back)
      } else {
        const id = await createSupplier(supplier)
        if (!screen.active || !isSessionCurrent(requestRevision)) return
        const errors: Record<string, string> = {}
        checkId(errors, 'id', 'Proveedor', id, true)
        if (errors.id) throw new SyntaxError('Identificador inesperado')
        toast.add({ type: 'success', title: 'Proveedor creado', description: `${supplier.supplierName} se creó correctamente.` })
        router.push(`/suppliers/${id}`)
      }
    } catch (reason) {
      if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); return }
      if (!screen.active || !isSessionCurrent(requestRevision)) return
      let message = reason instanceof TypeError || reason instanceof SyntaxError ? 'No fue posible confirmar el guardado. Compruebe el resultado antes de volver a enviarlo.' : supplierFormError(reason)
      if (reason instanceof Error && reason.cause === 400 && 'errors' in reason && reason.errors && typeof reason.errors === 'object') message += ` ${Object.values(reason.errors).filter(value => typeof value === 'string').join(' ')}`
      setSubmitError(message)
      toast.add({ type: 'error', title: 'No se pudo guardar el proveedor', description: message, priority: 'high', timeout: 8000 })
      setSubmitting(false)
    } finally {
      submitLock.current = false
    }
  }

  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
        <Link href={back} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"><ArrowLeftIcon className="size-4" aria-hidden="true" />{initial ? 'Volver al detalle' : 'Volver a proveedores'}</Link>
        <div><h1 className="text-2xl font-semibold tracking-tight">{initial ? 'Editar proveedor' : 'Crear proveedor'}</h1><p className="text-sm text-muted-foreground">Complete los datos obligatorios marcados con *.</p></div>
        {catalogLoading && <p role="status" className="text-sm text-muted-foreground">Cargando opciones...</p>}
        {catalogError && <div className="space-y-3 rounded-lg border bg-card p-4"><p role="alert" className="text-sm text-destructive">{catalogError}</p><Button type="button" variant="outline" disabled={catalogLoading || submitting} onClick={() => setCatalogRefresh(key => key + 1)}>Reintentar opciones</Button></div>}
        {submitError && <p role="alert" className="rounded-lg border bg-card p-4 text-sm text-destructive">{submitError}</p>}
        <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
          <fieldset disabled={submitting} className="space-y-6">
            <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Datos generales</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Nombre del proveedor" name="supplierName" maxLength={100} defaultValue={initial?.NombreProveedor} required />
                <TextField label="Código de referencia" name="supplierReference" maxLength={20} defaultValue={initial?.CodigoProveedor ?? ''} />
                <div className="grid gap-2"><Label htmlFor="supplierCategoryID">Categoría *</Label><DropdownMenu>
                  <DropdownMenuTrigger id="supplierCategoryID" type="button" disabled={Boolean(catalogError)} className={dropdownClass}><span className="min-w-0 truncate">{categories.find((category) => category.SupplierCategoryID === categoryID)?.NombreCategoriaProveedor ?? 'Seleccione una categoría'}</span><ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" /></DropdownMenuTrigger>
                  <DropdownMenuContent className="max-w-[calc(100vw-2rem)]"><DropdownMenuRadioGroup value={categoryID === null ? '' : String(categoryID)} onValueChange={(value) => setCategoryID(Number(value))}>{categories.map((category) => <DropdownMenuRadioItem key={category.SupplierCategoryID} value={String(category.SupplierCategoryID)} closeOnClick>{category.NombreCategoriaProveedor}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent>
                </DropdownMenu></div>
                <div className="grid gap-2"><Label htmlFor="deliveryMethodID">Método de entrega *</Label><DropdownMenu>
                  <DropdownMenuTrigger id="deliveryMethodID" type="button" disabled={Boolean(catalogError)} className={dropdownClass}><span className="min-w-0 truncate">{methods.find((method) => method.DeliveryMethodID === methodID)?.NombreMetodoEntrega ?? 'Seleccione un método'}</span><ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" /></DropdownMenuTrigger>
                  <DropdownMenuContent className="max-w-[calc(100vw-2rem)]"><DropdownMenuRadioGroup value={methodID === null ? '' : String(methodID)} onValueChange={(value) => setMethodID(Number(value))}>{methods.map((method) => <DropdownMenuRadioItem key={method.DeliveryMethodID} value={String(method.DeliveryMethodID)} closeOnClick>{method.NombreMetodoEntrega}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent>
                </DropdownMenu></div>
                <div className="grid gap-2"><Label htmlFor="lastEditedBy">{initial ? 'Empleado a cargo de la actualización *' : 'Empleado que registra *'}</Label><DropdownMenu>
                  <DropdownMenuTrigger id="lastEditedBy" type="button" disabled={Boolean(catalogError)} className={dropdownClass}><span className="min-w-0 truncate">{employees.find((employee) => employee.PersonID === lastEditedBy)?.NombreCompleto ?? 'Seleccione un empleado'}</span><ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" /></DropdownMenuTrigger>
                  <DropdownMenuContent className="max-w-[calc(100vw-2rem)] overflow-hidden p-0"><ScrollArea className="h-48 max-h-(--available-height)"><DropdownMenuRadioGroup value={lastEditedBy === null ? '' : String(lastEditedBy)} onValueChange={(value) => setLastEditedBy(Number(value))} className="p-1">{employees.map((employee) => <DropdownMenuRadioItem key={employee.PersonID} value={String(employee.PersonID)} closeOnClick>{employee.NombreCompleto}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></ScrollArea></DropdownMenuContent>
                </DropdownMenu>{initial && !employees.some((employee) => employee.PersonID === initial.LastEditedBy) && !catalogError && employees.length > 0 && <p className="text-xs text-muted-foreground">El último editor registrado no es empleado. Seleccione uno para guardar.</p>}</div>
                <TextField label="Días para pagar" name="paymentDays" type="number" min={0} step={1} defaultValue={initial?.DiasGraciaPago} required />
                <TextField label="Teléfono" name="phoneNumber" maxLength={20} defaultValue={initial?.Telefono} required />
                <TextField label="Fax" name="faxNumber" maxLength={20} defaultValue={initial?.Fax ?? ''} />
                <TextField label="Sitio web" name="websiteURL" type="url" maxLength={256} placeholder="https://ejemplo.com" defaultValue={initial?.SitioWeb ?? ''} />
              </div>
            </section>
            <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Contactos</h2><div className="grid gap-4 md:grid-cols-2">
                <LookupPicker id="primaryContact" label="Contacto principal" value={primaryContact} onChange={setPrimaryContact} search={findPeople} disabled={submitting} required sessionAware />
                 <LookupPicker id="alternateContact" label="Contacto alternativo" value={alternateContact} onChange={setAlternateContact} search={findPeople} disabled={submitting} required sessionAware />
              </div>
            </section>
            <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Datos bancarios</h2><div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Nombre de la cuenta" name="bankAccountName" maxLength={50} defaultValue={initial?.NombreBanco ?? ''} />
                <TextField label="Sucursal" name="bankAccountBranch" maxLength={50} defaultValue={initial?.SucursalBanco ?? ''} />
                <TextField label="Código de banco" name="bankAccountCode" maxLength={20} defaultValue={initial?.CodigoCuentaBancaria ?? ''} />
                <TextField label="Número de cuenta" name="bankAccountNumber" maxLength={20} defaultValue={initial?.NumeroCuentaBancaria ?? ''} />
                <TextField label="Código SWIFT" name="bankInternationalCode" maxLength={20} defaultValue={initial?.CodigoSwift ?? ''} />
              </div>
            </section>
            <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Direcciones</h2><div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4"><h3 className="font-medium">Entrega</h3>
                  <TextField label="Dirección, línea 1" name="deliveryAddressLine1" maxLength={60} defaultValue={initial?.DireccionEntrega1} required />
                  <TextField label="Dirección, línea 2" name="deliveryAddressLine2" maxLength={60} defaultValue={initial?.DireccionEntrega2 ?? ''} />
                  <LookupPicker id="deliveryCity" label="Ciudad de entrega" value={deliveryCity} onChange={setDeliveryCity} search={findCities} disabled={submitting} required sessionAware />
                  <TextField label="Código postal" name="deliveryPostalCode" maxLength={10} defaultValue={initial?.CodigoPostalEntrega} required />
                </div>
                <div className="space-y-4"><h3 className="font-medium">Postal</h3>
                  <TextField label="Dirección, línea 1" name="postalAddressLine1" maxLength={60} defaultValue={initial?.DireccionPostal1} required />
                  <TextField label="Dirección, línea 2" name="postalAddressLine2" maxLength={60} defaultValue={initial?.DireccionPostal2 ?? ''} />
                  <p className="text-sm text-muted-foreground">La ciudad y el código postal serán los mismos que en la dirección de entrega.</p>
                </div>
              </div>
              <h3 className="font-medium">Ubicación de entrega (opcional)</h3><p className="text-sm text-muted-foreground">Si proporciona coordenadas, indique ambas.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Latitud" name="latitude" type="number" min={-90} max={90} step="any" defaultValue={initial?.Latitud ?? ''} />
                <TextField label="Longitud" name="longitude" type="number" min={-180} max={180} step="any" defaultValue={initial?.Longitud ?? ''} />
              </div>
            </section>
            <section className="space-y-2 rounded-lg border bg-card p-4 shadow-sm sm:p-6"><Label htmlFor="internalComments">Comentarios internos</Label><textarea id="internalComments" name="internalComments" defaultValue={initial?.ComentariosInternos ?? ''} className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-ring" /></section>
            <div className="flex flex-wrap justify-end gap-2"><Button nativeButton={false} render={<Link href={back} />} variant="outline">Cancelar</Button><Button type="submit" disabled={submitting || catalogLoading || Boolean(catalogError)}>{submitting ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear proveedor'}</Button></div>
          </fieldset>
        </form>
      </div>
    </main>
  )
}
