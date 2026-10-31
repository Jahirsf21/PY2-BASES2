'use client'

import type { SubmitEvent } from 'react'
import { useEffect, useState } from 'react'
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
import { validateCustomer } from '@/lib/helpers/entityValidation'
import type { NewCustomer, BuyingGroup, CustomerCategory, CustomerEdit } from '@/lib/types/customers'
import type { DeliveryMethod } from '@/lib/types/deliveryMethods'
import type { Employee } from '@/lib/types/application'

const LOOKUP_SIZE = 8

async function findBillTo(query: string, page: number) {
  const result = await getBillToCustomers(query, page, LOOKUP_SIZE)
  return { items: result.data.map((customer) => ({ id: customer.CustomerID, label: customer.NombreCliente })), totalPages: result.totalPages }
}

async function findPeople(query: string, page: number) {
  const result = await getPeople(query, page, LOOKUP_SIZE)
  return { items: result.data.map((person) => ({ id: person.PersonID, label: person.NombreCompleto })), totalPages: result.totalPages }
}

async function findCities(query: string, page: number) {
  const result = await getCities(query, page, LOOKUP_SIZE)
  return { items: result.data.map((city) => ({ id: city.CityID, label: `${city.NombreCiudad}, ${city.Provincia}, ${city.NombrePais}` })), totalPages: result.totalPages }
}

function TextField({ label, name, required, ...props }: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={name}>{label}{required ? ' *' : ''}</Label>
      <Input id={name} name={name} required={required} {...props} />
    </div>
  )
}

const dropdownClass = 'flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

export function CustomerForm({ initial }: { initial?: CustomerEdit }) {
  const router = useRouter()
  const editing = Boolean(initial)
  const [categories, setCategories] = useState<CustomerCategory[]>([])
  const [groups, setGroups] = useState<BuyingGroup[]>([])
  const [methods, setMethods] = useState<DeliveryMethod[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [customerCategoryID, setCustomerCategoryID] = useState<number | null>(initial?.CustomerCategoryID ?? null)
  const [deliveryMethodID, setDeliveryMethodID] = useState<number | null>(initial?.DeliveryMethodID ?? null)
  const [buyingGroupID, setBuyingGroupID] = useState<number | null>(initial?.BuyingGroupID ?? null)
  const [lastEditedBy, setLastEditedBy] = useState<number | null>(initial?.LastEditedBy ?? null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [billTo, setBillTo] = useState<LookupOption | null>(initial && initial.BillToCustomerID !== initial.CustomerID ? { id: initial.BillToCustomerID, label: initial.NombreClientePorFacturar } : null)
  const [primaryContact, setPrimaryContact] = useState<LookupOption | null>(initial ? { id: initial.PrimaryContactPersonID, label: initial.NombreContactoPrincipal } : null)
  const [alternateContact, setAlternateContact] = useState<LookupOption | null>(initial?.AlternateContactPersonID ? { id: initial.AlternateContactPersonID, label: initial.NombreContactoAlternativo ?? '' } : null)
  const [deliveryCity, setDeliveryCity] = useState<LookupOption | null>(initial ? { id: initial.DeliveryCityID, label: initial.CiudadEntrega } : null)
  const [statementSent, setStatementSent] = useState(Boolean(initial?.EnviarEstadoCuenta))
  const [creditHold, setCreditHold] = useState(Boolean(initial?.CreditoSuspendido))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([getCustomerCategories(), getBuyingGroups(), getDeliveryMethods(), getEmployees()])
      .then(([customerCategories, buyingGroups, deliveryMethods, employeeList]) => {
        if (!cancelled) {
          setCategories(customerCategories)
          setGroups(buyingGroups)
          setMethods(deliveryMethods)
          setEmployees(employeeList)
          setLastEditedBy((selected) => employeeList.some((employee) => employee.PersonID === selected) ? selected : null)
        }
      })
      .catch(() => {
        if (cancelled) return
        const message = 'No fue posible cargar las opciones del formulario. Recargue la página.'
        setCatalogError(message)
        toast.add({ type: 'error', title: 'No se pudieron cargar las opciones del cliente', description: message, priority: 'high', timeout: 8000 })
      })
    return () => { cancelled = true }
  }, [])

  function showValidationError(message: string) {
    toast.add({ type: 'error', title: 'Revise los datos del cliente', description: message, priority: 'high', timeout: 8000 })
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
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

    setSubmitting(true)
    try {
      if (initial) {
        await updateCustomerByID(initial.CustomerID, customer)
        toast.add({ type: 'success', title: 'Cliente actualizado', description: `${customer.customerName} se actualizó correctamente.` })
        router.push(`/customers/${initial.CustomerID}`)
      } else {
        const id = await createCustomer(customer)
        toast.add({ type: 'success', title: 'Cliente creado', description: `${customer.customerName} se creó correctamente.` })
        router.push(`/customers/${id}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible guardar el cliente'
      toast.add({ type: 'error', title: editing ? 'No se pudo actualizar el cliente' : 'No se pudo crear el cliente', description: message, priority: 'high', timeout: 8000 })
      setSubmitting(false)
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
        <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
          <fieldset disabled={submitting} className="space-y-6">
            <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Datos generales</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Nombre del cliente" name="customerName" maxLength={100} defaultValue={initial?.NombreCliente} required />
                <div className="grid gap-2">
                  <Label htmlFor="customerCategoryID">Categoría *</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger id="customerCategoryID" type="button" disabled={submitting || Boolean(catalogError)} className={dropdownClass}>
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
                    <DropdownMenuTrigger id="deliveryMethodID" type="button" disabled={submitting || Boolean(catalogError)} className={dropdownClass}>
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
                    <DropdownMenuTrigger id="buyingGroupID" type="button" disabled={submitting || Boolean(catalogError)} className={dropdownClass}>
                      <span className="min-w-0 truncate">{groups.find((group) => group.BuyingGroupID === buyingGroupID)?.NombreGrupoCompra ?? 'Sin grupo'}</span>
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
                    <DropdownMenuTrigger id="lastEditedBy" type="button" disabled={submitting || Boolean(catalogError)} className={dropdownClass}>
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
                  <LookupPicker id="billTo" label="Cliente por facturar" value={billTo} onChange={setBillTo} search={findBillTo} disabled={submitting} />
                  <p className="text-xs text-muted-foreground">Si no selecciona otro cliente, {editing ? 'este cliente' : 'el nuevo cliente'} se factura a sí mismo.</p>
                </div>
                <LookupPicker id="primaryContact" label="Contacto principal" value={primaryContact} onChange={setPrimaryContact} search={findPeople} disabled={submitting} required />
                <LookupPicker id="alternateContact" label="Contacto alternativo" value={alternateContact} onChange={setAlternateContact} search={findPeople} disabled={submitting} />
              </div>
            </section>

            <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Direcciones</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-medium">Entrega</h3>
                  <TextField label="Dirección, línea 1" name="deliveryAddressLine1" maxLength={60} defaultValue={initial?.DireccionEntrega1} required />
                  <TextField label="Dirección, línea 2" name="deliveryAddressLine2" maxLength={60} defaultValue={initial?.DireccionEntrega2 ?? ''} />
                  <LookupPicker id="deliveryCity" label="Ciudad de entrega" value={deliveryCity} onChange={setDeliveryCity} search={findCities} disabled={submitting} required />
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
              <Button type="submit" disabled={submitting || Boolean(catalogError)}>{submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear cliente'}</Button>
            </div>
          </fieldset>
        </form>
      </div>
    </main>
  )
}
