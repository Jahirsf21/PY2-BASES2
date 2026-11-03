'use client'

import type { SubmitEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCities, getDeliveryMethods, getEmployees, getPeople } from '@/app/api/application'
import { createSupplier, getSupplierCategories, updateSupplierByID } from '@/app/api/suppliers'
import { LookupPicker, type LookupOption } from '@/app/customers/lookup-picker'
import { FormStepper, StepPanel, type FormStep } from '@/components/form-stepper'
import { FormAlerts, FormHeader, RequiredMark, ReviewSections, SelectField, StepActions, TextField, serverFieldErrors, useStepForm } from '@/components/form-kit'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { checkId, validateSupplier } from '@/lib/helpers/entityValidation'
import { useSession } from '@/components/auth-session'
import type { Employee } from '@/lib/types/application'
import type { DeliveryMethod } from '@/lib/types/deliveryMethods'
import type { NewSupplier, SupplierCategory, SupplierEdit } from '@/lib/types/suppliers'

const LOOKUP_SIZE = 8

const STEPS: FormStep[] = [
  { id: 'general', title: 'Datos generales', description: 'Identificación, categoría, condiciones de pago y medios de contacto del proveedor.' },
  { id: 'contacts', title: 'Contactos', description: 'Personas de referencia con las que se coordina el proveedor.' },
  { id: 'addresses', title: 'Direcciones', description: 'Dirección de entrega, dirección postal y ubicación opcional en el mapa.' },
  { id: 'bank', title: 'Banco y notas', description: 'Datos bancarios opcionales y comentarios internos.' },
  { id: 'review', title: 'Revisión', description: 'Compruebe la información antes de guardar.' },
]

/** Paso al que pertenece cada campo, para dirigir al usuario al primer error. */
const FIELD_STEP: Record<string, number> = {
  supplierName: 0, supplierReference: 0, supplierCategoryID: 0, deliveryMethodID: 0, lastEditedBy: 0, paymentDays: 0, phoneNumber: 0, faxNumber: 0, websiteURL: 0,
  primaryContactPersonID: 1, alternateContactPersonID: 1, primaryContact: 1, alternateContact: 1,
  deliveryAddressLine1: 2, deliveryAddressLine2: 2, deliveryCityID: 2, deliveryCity: 2, deliveryPostalCode: 2, postalAddressLine1: 2, postalAddressLine2: 2, latitude: 2, longitude: 2,
  bankAccountName: 3, bankAccountBranch: 3, bankAccountCode: 3, bankAccountNumber: 3, bankInternationalCode: 3, internalComments: 3,
}

async function findPeople(query: string, page: number) {
  const result = await getPeople(query, page, LOOKUP_SIZE)
  return { items: result.data.map((person) => ({ id: person.PersonID, label: person.NombreCompleto })), totalPages: result.totalPages }
}

async function findCities(query: string, page: number) {
  const result = await getCities(query, page, LOOKUP_SIZE)
  return { items: result.data.map((city) => ({ id: city.CityID, label: `${city.NombreCiudad}, ${city.Provincia}, ${city.NombrePais}` })), totalPages: result.totalPages }
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

  const { formRef, topRef, ...form } = useStepForm({
    steps: STEPS,
    editing: Boolean(initial),
    stepOf: key => FIELD_STEP[key],
    customErrors: (index, data) => {
      const errors: Record<string, string> = {}
      if (index === 0) {
        if (categoryID === null) errors.supplierCategoryID = 'Seleccione una categoría.'
        if (methodID === null) errors.deliveryMethodID = 'Seleccione un método de entrega.'
        if (lastEditedBy === null || !employees.some((employee) => employee.PersonID === lastEditedBy)) errors.lastEditedBy = 'Seleccione un empleado válido.'
      }
      if (index === 1) {
        if (!primaryContact) errors.primaryContact = 'Seleccione el contacto principal.'
        if (!alternateContact) errors.alternateContact = 'Seleccione el contacto alternativo.'
      }
      if (index === 2) {
        if (!deliveryCity) errors.deliveryCity = 'Seleccione la ciudad de entrega.'
        const latitude = String(data?.get('latitude') ?? '').trim(), longitude = String(data?.get('longitude') ?? '').trim()
        if ((latitude === '') !== (longitude === '')) errors[latitude === '' ? 'latitude' : 'longitude'] = 'Indique latitud y longitud, o deje ambas vacías.'
      }
      return errors
    },
  })
  const { fieldErrors, clearError } = form

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

  /** Mantiene el envío único y sus efectos dentro de la pantalla y sesión iniciadoras. */
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.isReview) { form.next(); return }
    const requestRevision = revision
    const screen = lifetime.current
    if (submitting || submitLock.current || catalogLoading || catalogError || !screen.active || !isSessionCurrent(requestRevision)) return
    const stepErrors = form.allErrors()
    if (Object.keys(stepErrors).length > 0 || categoryID === null || methodID === null || lastEditedBy === null || !primaryContact || !alternateContact || !deliveryCity) {
      form.showErrorsAt(stepErrors)
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
      form.showErrorsAt(Object.fromEntries(fields.map(field => [field, errors[field]])))
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
      const serverErrors = serverFieldErrors(reason)
      if (Object.keys(serverErrors).length) message += ` ${Object.values(serverErrors).join(' ')}`
      if (Object.keys(serverErrors).some(key => key in FIELD_STEP)) form.showErrorsAt(serverErrors)
      setSubmitError(message)
      toast.add({ type: 'error', title: 'No se pudo guardar el proveedor', description: message, priority: 'high', timeout: 8000 })
      setSubmitting(false)
    } finally {
      submitLock.current = false
    }
  }

  const catalogBlocked = catalogLoading || Boolean(catalogError)
  const option = <T,>(list: T[], key: keyof T, label: keyof T) => list.map(item => ({ value: Number(item[key]), label: String(item[label]) }))
  const nameOf = <T,>(list: T[], key: keyof T, label: keyof T, id: number | null) => { const found = list.find(item => item[key] === id); return found ? String(found[label]) : null }
  const review = form.review

  return (
    <main className="flex min-w-0 flex-1 bg-muted/40">
      <div ref={topRef} className="mx-auto w-full max-w-4xl scroll-mt-4 space-y-6 px-4 pt-6 sm:px-8 sm:pt-8">
        <FormHeader backHref={back} backLabel={initial ? 'Volver al detalle' : 'Volver a proveedores'} title={initial ? 'Editar proveedor' : 'Nuevo proveedor'}
          description={initial ? <>Modificando <span className="font-medium text-foreground">{initial.NombreProveedor}</span>. Puede saltar a cualquier paso.</> : 'Complete los pasos. Los campos marcados con * son obligatorios.'} />

        <FormStepper steps={STEPS} current={form.step} invalid={form.invalidSteps} completed={index => index < form.visited} canSelect={index => index <= form.visited && !submitting} onSelect={form.goTo} />

        <FormAlerts loading={catalogLoading} errors={catalogError ? [catalogError] : []} onRetry={() => setCatalogRefresh(key => key + 1)} retryDisabled={catalogLoading || submitting} submitError={submitError} />

        <form ref={formRef} noValidate className="space-y-6" onSubmit={(event) => void handleSubmit(event)} onInput={form.onInput}>
          <fieldset disabled={submitting} className="min-w-0">
            <StepPanel step={STEPS[0]} index={0} active={form.step === 0}>
              <FieldGroup>
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField label="Nombre del proveedor" name="supplierName" maxLength={100} defaultValue={initial?.NombreProveedor} required error={fieldErrors.supplierName} />
                  <TextField label="Código de referencia" name="supplierReference" maxLength={20} defaultValue={initial?.CodigoProveedor ?? ''} error={fieldErrors.supplierReference} />
                  <SelectField id="supplierCategoryID" label="Categoría" placeholder="Seleccione una categoría" value={categoryID} onChange={(value) => { setCategoryID(value); clearError('supplierCategoryID') }} options={option(categories, 'SupplierCategoryID', 'NombreCategoriaProveedor')} disabled={catalogBlocked || submitting} error={fieldErrors.supplierCategoryID} />
                  <SelectField id="deliveryMethodID" label="Método de entrega" placeholder="Seleccione un método" value={methodID} onChange={(value) => { setMethodID(value); clearError('deliveryMethodID') }} options={option(methods, 'DeliveryMethodID', 'NombreMetodoEntrega')} disabled={catalogBlocked || submitting} error={fieldErrors.deliveryMethodID} />
                </div>
                <Separator />
                <div className="grid gap-5 sm:grid-cols-2">
                  <SelectField id="lastEditedBy" label={initial ? 'Empleado a cargo de la actualización' : 'Empleado que registra'} placeholder="Seleccione un empleado" value={lastEditedBy} onChange={(value) => { setLastEditedBy(value); clearError('lastEditedBy') }} options={option(employees, 'PersonID', 'NombreCompleto')} disabled={catalogBlocked || submitting} error={fieldErrors.lastEditedBy}
                    hint={initial && !employees.some((employee) => employee.PersonID === initial.LastEditedBy) && !catalogError && employees.length > 0 ? 'El último editor registrado no es empleado. Seleccione uno para guardar.' : undefined} />
                  <TextField label="Días para pagar" name="paymentDays" type="number" inputMode="numeric" min={0} step={1} defaultValue={initial?.DiasGraciaPago} required error={fieldErrors.paymentDays} />
                </div>
                <Separator />
                <div className="grid gap-5 sm:grid-cols-3">
                  <TextField label="Teléfono" name="phoneNumber" type="tel" maxLength={20} defaultValue={initial?.Telefono} required error={fieldErrors.phoneNumber} />
                  <TextField label="Fax" name="faxNumber" type="tel" maxLength={20} defaultValue={initial?.Fax ?? ''} error={fieldErrors.faxNumber} />
                  <TextField label="Sitio web" name="websiteURL" type="url" maxLength={256} placeholder="https://ejemplo.com" defaultValue={initial?.SitioWeb ?? ''} error={fieldErrors.websiteURL} />
                </div>
              </FieldGroup>
            </StepPanel>

            <StepPanel step={STEPS[1]} index={1} active={form.step === 1}>
              <div className="grid gap-5 md:grid-cols-2">
                <LookupPicker id="primaryContact" label="Contacto principal" placeholder="Seleccione una persona" value={primaryContact} onChange={(value) => { setPrimaryContact(value); clearError('primaryContact') }} search={findPeople} disabled={submitting} required sessionAware error={fieldErrors.primaryContact ?? fieldErrors.primaryContactPersonID} />
                <LookupPicker id="alternateContact" label="Contacto alternativo" placeholder="Seleccione una persona" value={alternateContact} onChange={(value) => { setAlternateContact(value); clearError('alternateContact') }} search={findPeople} disabled={submitting} required sessionAware error={fieldErrors.alternateContact ?? fieldErrors.alternateContactPersonID} />
              </div>
            </StepPanel>

            <StepPanel step={STEPS[2]} index={2} active={form.step === 2}>
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <FieldSet className="rounded-lg border bg-muted/30 p-4">
                    <FieldLegend>Dirección de entrega</FieldLegend>
                    <TextField label="Dirección, línea 1" name="deliveryAddressLine1" maxLength={60} defaultValue={initial?.DireccionEntrega1} required error={fieldErrors.deliveryAddressLine1} />
                    <TextField label="Dirección, línea 2" name="deliveryAddressLine2" maxLength={60} defaultValue={initial?.DireccionEntrega2 ?? ''} error={fieldErrors.deliveryAddressLine2} />
                    <LookupPicker id="deliveryCity" label="Ciudad de entrega" placeholder="Seleccione una ciudad" value={deliveryCity} onChange={(value) => { setDeliveryCity(value); clearError('deliveryCity') }} search={findCities} disabled={submitting} required sessionAware error={fieldErrors.deliveryCity ?? fieldErrors.deliveryCityID} />
                    <TextField label="Código postal" name="deliveryPostalCode" maxLength={10} defaultValue={initial?.CodigoPostalEntrega} required error={fieldErrors.deliveryPostalCode} />
                  </FieldSet>
                  <FieldSet className="rounded-lg border bg-muted/30 p-4">
                    <FieldLegend>Dirección postal</FieldLegend>
                    <TextField label="Dirección, línea 1" name="postalAddressLine1" maxLength={60} defaultValue={initial?.DireccionPostal1} required error={fieldErrors.postalAddressLine1} />
                    <TextField label="Dirección, línea 2" name="postalAddressLine2" maxLength={60} defaultValue={initial?.DireccionPostal2 ?? ''} error={fieldErrors.postalAddressLine2} />
                    <FieldDescription>La ciudad y el código postal serán los mismos que en la dirección de entrega.</FieldDescription>
                  </FieldSet>
                </div>
                <FieldSet>
                  <FieldLegend>Ubicación de entrega</FieldLegend>
                  <FieldDescription>Opcional. Si proporciona coordenadas, indique ambas.</FieldDescription>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField label="Latitud" name="latitude" type="number" min={-90} max={90} step="any" defaultValue={initial?.Latitud ?? ''} error={fieldErrors.latitude} />
                    <TextField label="Longitud" name="longitude" type="number" min={-180} max={180} step="any" defaultValue={initial?.Longitud ?? ''} error={fieldErrors.longitude} />
                  </div>
                </FieldSet>
              </div>
            </StepPanel>

            <StepPanel step={STEPS[3]} index={3} active={form.step === 3}>
              <FieldGroup>
                <FieldSet>
                  <FieldLegend>Datos bancarios</FieldLegend>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField label="Nombre de la cuenta" name="bankAccountName" maxLength={50} defaultValue={initial?.NombreBanco ?? ''} error={fieldErrors.bankAccountName} />
                    <TextField label="Sucursal" name="bankAccountBranch" maxLength={50} defaultValue={initial?.SucursalBanco ?? ''} error={fieldErrors.bankAccountBranch} />
                    <TextField label="Código de banco" name="bankAccountCode" maxLength={20} defaultValue={initial?.CodigoCuentaBancaria ?? ''} error={fieldErrors.bankAccountCode} />
                    <TextField label="Número de cuenta" name="bankAccountNumber" maxLength={20} defaultValue={initial?.NumeroCuentaBancaria ?? ''} error={fieldErrors.bankAccountNumber} />
                    <TextField label="Código SWIFT" name="bankInternationalCode" maxLength={20} defaultValue={initial?.CodigoSwift ?? ''} error={fieldErrors.bankInternationalCode} />
                  </div>
                </FieldSet>
                <Separator />
                <Field data-invalid={Boolean(fieldErrors.internalComments) || undefined}>
                  <FieldLabel htmlFor="internalComments">Comentarios internos<RequiredMark /></FieldLabel>
                  <Textarea id="internalComments" name="internalComments" defaultValue={initial?.ComentariosInternos ?? ''} className="min-h-28" aria-invalid={Boolean(fieldErrors.internalComments) || undefined} />
                  {fieldErrors.internalComments && <FieldError>{fieldErrors.internalComments}</FieldError>}
                </Field>
              </FieldGroup>
            </StepPanel>

            <StepPanel step={STEPS[4]} index={4} active={form.isReview}>
              <ReviewSections steps={STEPS} onEdit={form.goTo} sections={[
                { step: 0, items: [['Nombre', review.supplierName], ['Código de referencia', review.supplierReference], ['Categoría', nameOf(categories, 'SupplierCategoryID', 'NombreCategoriaProveedor', categoryID)], ['Método de entrega', nameOf(methods, 'DeliveryMethodID', 'NombreMetodoEntrega', methodID)], [initial ? 'Empleado a cargo' : 'Empleado que registra', nameOf(employees, 'PersonID', 'NombreCompleto', lastEditedBy)], ['Días para pagar', review.paymentDays], ['Teléfono', review.phoneNumber], ['Fax', review.faxNumber], ['Sitio web', review.websiteURL]] },
                { step: 1, items: [['Contacto principal', primaryContact?.label], ['Contacto alternativo', alternateContact?.label]] },
                { step: 2, items: [['Entrega', [review.deliveryAddressLine1, review.deliveryAddressLine2].filter(Boolean).join(', ')], ['Ciudad', deliveryCity?.label], ['Código postal', review.deliveryPostalCode], ['Postal', [review.postalAddressLine1, review.postalAddressLine2].filter(Boolean).join(', ')], ['Coordenadas', review.latitude && review.longitude ? `${review.latitude}, ${review.longitude}` : null]] },
                { step: 3, items: [['Cuenta', review.bankAccountName], ['Sucursal', review.bankAccountBranch], ['Código de banco', review.bankAccountCode], ['Número de cuenta', review.bankAccountNumber], ['SWIFT', review.bankInternationalCode], ['Comentarios', review.internalComments]] },
              ]} />
            </StepPanel>

            <StepActions step={form.step} total={STEPS.length} backHref={back} onBack={() => form.goTo(form.step - 1)} submitting={submitting} saveDisabled={catalogBlocked} saveLabel={initial ? 'Guardar cambios' : 'Crear proveedor'} />
          </fieldset>
        </form>
      </div>
    </main>
  )
}
