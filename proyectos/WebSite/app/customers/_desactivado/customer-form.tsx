// 'use client'
//
// import type { SubmitEvent } from 'react'
// import { useEffect, useRef, useState } from 'react'
// import { useRouter } from 'next/navigation'
// import { createCustomer, getBillToCustomers, getBuyingGroups, getCustomerCategories, updateCustomerByID } from '@/app/api/customers'
// import { getCities, getDeliveryMethods, getEmployees, getPeople } from '@/app/api/application'
// import { LookupPicker, type LookupOption } from '@/app/customers/lookup-picker'
// import { FormStepper, StepPanel, type FormStep } from '@/components/form-stepper'
// import { FormAlerts, FormHeader, ReviewSections, SelectField, StepActions, TextField, serverFieldErrors, useStepForm } from '@/components/form-kit'
// import { Checkbox } from '@/components/ui/checkbox'
// import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field'
// import { Separator } from '@/components/ui/separator'
// import { toast } from '@/components/ui/toast'
// import { useSession } from '@/components/auth-session'
// import { checkId, validateCustomer } from '@/lib/helpers/entityValidation'
// import type { NewCustomer, BuyingGroup, CustomerCategory, CustomerEdit } from '@/lib/types/customers'
// import type { DeliveryMethod } from '@/lib/types/deliveryMethods'
// import type { Employee } from '@/lib/types/application'
//
// const LOOKUP_SIZE = 8
// const catalogLabels = { categories: 'categorías de clientes', groups: 'grupos de compra', methods: 'métodos de entrega', employees: 'empleados' }
// type CatalogKey = keyof typeof catalogLabels
//
// const STEPS: FormStep[] = [
//   { id: 'general', title: 'Datos generales', description: 'Identificación, clasificación, condiciones de pago y medios de contacto del cliente.' },
//   { id: 'credit', title: 'Crédito y facturación', description: 'Cliente al que se factura, descuento, límite de crédito y estados de cuenta.' },
//   { id: 'contacts', title: 'Contactos', description: 'Personas de referencia del cliente.' },
//   { id: 'addresses', title: 'Direcciones', description: 'Dirección de entrega, dirección postal y ubicación opcional en el mapa.' },
//   { id: 'review', title: 'Revisión', description: 'Compruebe la información antes de guardar.' },
// ]
//
// /** Paso al que pertenece cada campo, para dirigir al usuario al primer error. */
// const FIELD_STEP: Record<string, number> = {
//   customerName: 0, customerCategoryID: 0, buyingGroupID: 0, deliveryMethodID: 0, lastEditedBy: 0, paymentDays: 0, phoneNumber: 0, faxNumber: 0, websiteURL: 0,
//   billTo: 1, billToCustomerID: 1, standardDiscountPercentage: 1, creditLimit: 1, isStatementSent: 1, isOnCreditHold: 1,
//   primaryContact: 2, primaryContactPersonID: 2, alternateContact: 2, alternateContactPersonID: 2,
//   deliveryAddressLine1: 3, deliveryAddressLine2: 3, deliveryCity: 3, deliveryCityID: 3, deliveryPostalCode: 3, postalAddressLine1: 3, postalAddressLine2: 3, latitude: 3, longitude: 3,
// }
//
// const moneyFormatter = new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
//
// /** Busca clientes por facturar conservando el tamaño de página del formulario. */
// async function findBillTo(query: string, page: number) {
//   const result = await getBillToCustomers(query, page, LOOKUP_SIZE)
//   return { items: result.data.map((customer) => ({ id: customer.CustomerID, label: customer.NombreCliente })), totalPages: result.totalPages }
// }
//
// /** Busca contactos utilizando sus identificadores PersonID originales. */
// async function findPeople(query: string, page: number) {
//   const result = await getPeople(query, page, LOOKUP_SIZE)
//   return { items: result.data.map((person) => ({ id: person.PersonID, label: person.NombreCompleto })), totalPages: result.totalPages }
// }
//
// /** Busca ciudades y conserva su etiqueta de ciudad, provincia y país. */
// async function findCities(query: string, page: number) {
//   const result = await getCities(query, page, LOOKUP_SIZE)
//   return { items: result.data.map((city) => ({ id: city.CityID, label: `${city.NombreCiudad}, ${city.Provincia}, ${city.NombrePais}` })), totalPages: result.totalPages }
// }
//
// /** Presenta errores de lectura sin exponer detalles internos de red o JSON. */
// function catalogMessage(reason: unknown, label: string): string {
//   const status = reason instanceof Error ? reason.cause : null
//   if (status === 403) return `Sin permisos para consultar ${label}.`
//   if (reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503)) return `No fue posible cargar ${label}. Intente nuevamente.`
//   return reason instanceof Error ? reason.message : `No fue posible cargar ${label}.`
// }
//
// /** Mantiene el formulario y sus operaciones dentro de la sesión que los originó. */
// export function CustomerForm({ initial }: { initial?: CustomerEdit }) {
//   const router = useRouter()
//   const { revision, isSessionCurrent, invalidateSession } = useSession()
//   const editing = Boolean(initial)
//   const [categories, setCategories] = useState<CustomerCategory[]>([])
//   const [groups, setGroups] = useState<BuyingGroup[]>([])
//   const [methods, setMethods] = useState<DeliveryMethod[]>([])
//   const [employees, setEmployees] = useState<Employee[]>([])
//   const [customerCategoryID, setCustomerCategoryID] = useState<number | null>(initial?.CustomerCategoryID ?? null)
//   const [deliveryMethodID, setDeliveryMethodID] = useState<number | null>(initial?.DeliveryMethodID ?? null)
//   const [buyingGroupID, setBuyingGroupID] = useState<number | null>(initial?.BuyingGroupID ?? null)
//   const [lastEditedBy, setLastEditedBy] = useState<number | null>(initial?.LastEditedBy ?? null)
//   const [catalogErrors, setCatalogErrors] = useState<Partial<Record<CatalogKey, string>>>({})
//   const [catalogLoading, setCatalogLoading] = useState<Record<CatalogKey, boolean>>({ categories: true, groups: true, methods: true, employees: true })
//   const [catalogRefresh, setCatalogRefresh] = useState(0)
//   const [billTo, setBillTo] = useState<LookupOption | null>(initial && initial.BillToCustomerID !== initial.CustomerID ? { id: initial.BillToCustomerID, label: initial.NombreClientePorFacturar } : null)
//   const [primaryContact, setPrimaryContact] = useState<LookupOption | null>(initial ? { id: initial.PrimaryContactPersonID, label: initial.NombreContactoPrincipal } : null)
//   const [alternateContact, setAlternateContact] = useState<LookupOption | null>(initial?.AlternateContactPersonID ? { id: initial.AlternateContactPersonID, label: initial.NombreContactoAlternativo ?? '' } : null)
//   const [deliveryCity, setDeliveryCity] = useState<LookupOption | null>(initial ? { id: initial.DeliveryCityID, label: initial.CiudadEntrega } : null)
//   const [statementSent, setStatementSent] = useState(Boolean(initial?.EnviarEstadoCuenta))
//   const [creditHold, setCreditHold] = useState(Boolean(initial?.CreditoSuspendido))
//   const [submitting, setSubmitting] = useState(false)
//   const [submitError, setSubmitError] = useState<{ message: string; fields: [string, string][] } | null>(null)
//   const submitLock = useRef(false)
//   const lifetime = useRef({ active: false })
//   const catalogsPending = Object.values(catalogLoading).some(Boolean)
//   const catalogsFailed = Object.values(catalogErrors).some(Boolean)
//   const back = initial ? `/customers/${initial.CustomerID}` : '/'
//
//   const { formRef, topRef, ...form } = useStepForm({
//     steps: STEPS,
//     editing,
//     stepOf: key => FIELD_STEP[key],
//     customErrors: (index, data) => {
//       const errors: Record<string, string> = {}
//       if (index === 0) {
//         if (customerCategoryID === null) errors.customerCategoryID = 'Seleccione una categoría.'
//         if (deliveryMethodID === null) errors.deliveryMethodID = 'Seleccione un método de entrega.'
//         if (lastEditedBy === null || !employees.some((employee) => employee.PersonID === lastEditedBy)) errors.lastEditedBy = 'Seleccione un empleado válido.'
//       }
//       if (index === 2 && !primaryContact) errors.primaryContact = 'Seleccione el contacto principal.'
//       if (index === 3) {
//         if (!deliveryCity) errors.deliveryCity = 'Seleccione la ciudad de entrega.'
//         const latitude = String(data?.get('latitude') ?? '').trim(), longitude = String(data?.get('longitude') ?? '').trim()
//         if ((latitude === '') !== (longitude === '')) errors[latitude === '' ? 'latitude' : 'longitude'] = 'Indique latitud y longitud, o deje ambas vacías.'
//       }
//       return errors
//     },
//   })
//   const { fieldErrors, clearError } = form
//
//   useEffect(() => {
//     const current = { active: true }
//     lifetime.current = current
//     return () => { current.active = false }
//   }, [])
//
//   useEffect(() => {
//     let cancelled = false
//     const requestRevision = revision
//
//     /** Cada catálogo procesa su propio 401, aunque otra lectura ya haya fallado. */
//     async function loadCatalog<T>(key: CatalogKey, read: () => Promise<T[]>, apply: (items: T[]) => void, required = false) {
//       if (!isSessionCurrent(requestRevision)) return
//       try {
//         const items = await read()
//         if (cancelled || !isSessionCurrent(requestRevision)) return
//         if (!Array.isArray(items)) throw new SyntaxError('Catálogo inesperado')
//         if (required && items.length === 0) throw new Error(`No hay ${catalogLabels[key]} disponibles para completar el formulario.`)
//         apply(items)
//         setCatalogErrors(previous => ({ ...previous, [key]: undefined }))
//       } catch (reason) {
//         if (reason instanceof Error && reason.cause === 401) {
//           invalidateSession(requestRevision)
//           return
//         }
//         if (cancelled || !isSessionCurrent(requestRevision)) return
//         setCatalogErrors(previous => ({ ...previous, [key]: catalogMessage(reason, catalogLabels[key]) }))
//       } finally {
//         if (!cancelled && isSessionCurrent(requestRevision)) setCatalogLoading(previous => ({ ...previous, [key]: false }))
//       }
//     }
//
//     queueMicrotask(() => {
//       if (cancelled || !isSessionCurrent(requestRevision)) return
//       setCatalogLoading({ categories: true, groups: true, methods: true, employees: true })
//       setCatalogErrors({})
//       void loadCatalog('categories', getCustomerCategories, setCategories, true)
//       void loadCatalog('groups', getBuyingGroups, setGroups)
//       void loadCatalog('methods', getDeliveryMethods, setMethods, true)
//       void loadCatalog('employees', getEmployees, items => {
//         setEmployees(items)
//         setLastEditedBy(selected => items.some(employee => employee.PersonID === selected) ? selected : null)
//       }, true)
//     })
//     return () => { cancelled = true }
//   }, [catalogRefresh, revision, isSessionCurrent, invalidateSession])
//
//   /** Informa una validación local sin borrar el borrador. */
//   function showValidationError(message: string) {
//     toast.add({ type: 'error', title: 'Revise los datos del cliente', description: message, priority: 'high', timeout: 8000 })
//   }
//
//   /** Envía una sola mutación y descarta sus efectos si cambia pantalla o sesión. */
//   async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
//     event.preventDefault()
//     if (!form.isReview) { form.next(); return }
//     const requestRevision = revision
//     const screen = lifetime.current
//     if (submitLock.current || submitting || !screen.active || !isSessionCurrent(requestRevision)) return
//     if (catalogsPending || catalogsFailed) {
//       showValidationError('Espere a que las opciones del formulario estén disponibles o reintente su carga.')
//       return
//     }
//     const stepErrors = form.allErrors()
//     if (Object.keys(stepErrors).length > 0 || customerCategoryID === null || deliveryMethodID === null || lastEditedBy === null || !primaryContact || !deliveryCity) {
//       form.showErrorsAt(stepErrors)
//       return
//     }
//
//     const data = new FormData(event.currentTarget)
//     const text = (name: string) => String(data.get(name) ?? '').trim()
//     const optionalNumber = (name: string) => text(name) === '' ? null : Number(text(name))
//     const latitude = optionalNumber('latitude')
//     const longitude = optionalNumber('longitude')
//
//     const customer: NewCustomer = {
//       customerName: text('customerName'),
//       customerCategoryID,
//       billToCustomerID: billTo?.id ?? initial?.CustomerID ?? null,
//       lastEditedBy,
//       standardDiscountPercentage: Number(text('standardDiscountPercentage') || '0'),
//       creditLimit: optionalNumber('creditLimit'),
//       isStatementSent: statementSent,
//       isOnCreditHold: creditHold,
//       buyingGroupID,
//       primaryContactPersonID: primaryContact.id,
//       alternateContactPersonID: alternateContact?.id ?? null,
//       deliveryMethodID,
//       paymentDays: Number(text('paymentDays')),
//       phoneNumber: text('phoneNumber'),
//       faxNumber: text('faxNumber') || null,
//       websiteURL: text('websiteURL') || null,
//       deliveryAddressLine1: text('deliveryAddressLine1'),
//       deliveryAddressLine2: text('deliveryAddressLine2') || null,
//       deliveryCityID: deliveryCity.id,
//       deliveryPostalCode: text('deliveryPostalCode'),
//       postalAddressLine1: text('postalAddressLine1'),
//       postalAddressLine2: text('postalAddressLine2') || null,
//       latitude,
//       longitude,
//     }
//
//     const { fields, errors } = validateCustomer(customer, editing)
//     if (fields.length > 0) {
//       form.showErrorsAt(Object.fromEntries(fields.map(field => [field, errors[field]])))
//       return
//     }
//
//     if (!isSessionCurrent(requestRevision)) return
//     submitLock.current = true
//     setSubmitting(true)
//     setSubmitError(null)
//     try {
//       if (initial) {
//         await updateCustomerByID(initial.CustomerID, customer)
//         if (!screen.active || !isSessionCurrent(requestRevision)) return
//         toast.add({ type: 'success', title: 'Cliente actualizado', description: `${customer.customerName} se actualizó correctamente.` })
//         router.push(`/customers/${initial.CustomerID}`)
//       } else {
//         const id = await createCustomer(customer)
//         if (!screen.active || !isSessionCurrent(requestRevision)) return
//         const idErrors: Record<string, string> = {}
//         checkId(idErrors, 'id', 'Cliente', id, true)
//         if (idErrors.id) throw new SyntaxError('Identificador de creación inesperado')
//         toast.add({ type: 'success', title: 'Cliente creado', description: `${customer.customerName} se creó correctamente.` })
//         router.push(`/customers/${id}`)
//       }
//     } catch (reason) {
//       const status = reason instanceof Error ? reason.cause : null
//       if (status === 401) {
//         invalidateSession(requestRevision)
//         return
//       }
//       if (!screen.active || !isSessionCurrent(requestRevision)) return
//       let message = reason instanceof Error ? reason.message : 'No fue posible guardar el cliente.'
//       if (status === 403) message = 'Sin permisos para guardar el cliente.'
//       else if (reason instanceof TypeError || reason instanceof SyntaxError) message = 'No fue posible confirmar el resultado del guardado. Compruebe si el cliente se guardó antes de volver a enviarlo.'
//       else if (typeof status === 'number' && status >= 500 && status !== 503) message = 'No fue posible guardar el cliente. Compruebe el resultado antes de volver a enviarlo.'
//       const serverErrors = serverFieldErrors(reason)
//       if (Object.keys(serverErrors).some(key => key in FIELD_STEP)) form.showErrorsAt(serverErrors)
//       setSubmitError({ message, fields: Object.entries(serverErrors) })
//       toast.add({ type: 'error', title: editing ? 'No se pudo actualizar el cliente' : 'No se pudo crear el cliente', description: message, priority: 'high', timeout: 8000 })
//       setSubmitting(false)
//     } finally {
//       submitLock.current = false
//     }
//   }
//
//   const option = <T,>(list: T[], key: keyof T, label: keyof T) => list.map(item => ({ value: Number(item[key]), label: String(item[label]) }))
//   const nameOf = <T,>(list: T[], key: keyof T, label: keyof T, id: number | null) => { const found = list.find(item => item[key] === id); return found ? String(found[label]) : null }
//   const review = form.review
//   const blocked = (key: CatalogKey) => submitting || catalogLoading[key] || Boolean(catalogErrors[key])
//
//   return (
//     <main className="flex min-w-0 flex-1 bg-muted/40">
//       <div ref={topRef} className="mx-auto w-full max-w-4xl scroll-mt-4 space-y-6 px-4 pt-6 sm:px-8 sm:pt-8">
//         <FormHeader backHref={back} backLabel={editing ? 'Volver al detalle' : 'Volver a clientes'} title={editing ? 'Editar cliente' : 'Nuevo cliente'}
//           description={initial ? <>Modificando <span className="font-medium text-foreground">{initial.NombreCliente}</span>. Puede saltar a cualquier paso.</> : 'Complete los pasos. Los campos marcados con * son obligatorios.'} />
//
//         <FormStepper steps={STEPS} current={form.step} invalid={form.invalidSteps} completed={index => index < form.visited} canSelect={index => index <= form.visited && !submitting} onSelect={form.goTo} />
//
//         <FormAlerts loading={catalogsPending} errors={(Object.keys(catalogLabels) as CatalogKey[]).flatMap(key => catalogErrors[key] ? [catalogErrors[key]!] : [])} onRetry={() => setCatalogRefresh(value => value + 1)} retryDisabled={submitting || catalogsPending}
//           submitError={submitError && <><p>{submitError.message}</p>{submitError.fields.length > 0 && <ul className="list-disc pl-4">{submitError.fields.map(([field, message]) => <li key={field}>{message}</li>)}</ul>}</>} />
//
//         <form ref={formRef} noValidate className="space-y-6" onSubmit={(event) => void handleSubmit(event)} onInput={form.onInput}>
//           <fieldset disabled={submitting} className="min-w-0">
//             <StepPanel step={STEPS[0]} index={0} active={form.step === 0}>
//               <FieldGroup>
//                 <div className="grid gap-5 sm:grid-cols-2">
//                   <TextField label="Nombre del cliente" name="customerName" maxLength={100} defaultValue={initial?.NombreCliente} required error={fieldErrors.customerName} />
//                   <SelectField id="customerCategoryID" label="Categoría" placeholder="Seleccione una categoría" value={customerCategoryID} onChange={(value) => { setCustomerCategoryID(value); clearError('customerCategoryID') }} options={option(categories, 'CustomerCategoryID', 'NombreCategoria')} disabled={blocked('categories')} error={fieldErrors.customerCategoryID} />
//                   <SelectField id="buyingGroupID" label="Grupo de compra" placeholder="Sin grupo" required={false} noneLabel="Sin grupo" value={buyingGroupID} onChange={setBuyingGroupID} options={option(groups, 'BuyingGroupID', 'NombreGrupoCompra')} disabled={blocked('groups')} error={fieldErrors.buyingGroupID} />
//                   <SelectField id="deliveryMethodID" label="Método de entrega" placeholder="Seleccione un método" value={deliveryMethodID} onChange={(value) => { setDeliveryMethodID(value); clearError('deliveryMethodID') }} options={option(methods, 'DeliveryMethodID', 'NombreMetodoEntrega')} disabled={blocked('methods')} error={fieldErrors.deliveryMethodID} />
//                 </div>
//                 <Separator />
//                 <div className="grid gap-5 sm:grid-cols-2">
//                   <SelectField id="lastEditedBy" label={editing ? 'Empleado a cargo de la actualización' : 'Empleado que registra'} placeholder="Seleccione un empleado" value={lastEditedBy} onChange={(value) => { setLastEditedBy(value); clearError('lastEditedBy') }} options={option(employees, 'PersonID', 'NombreCompleto')} disabled={blocked('employees')} error={fieldErrors.lastEditedBy}
//                     hint={initial && !employees.some((employee) => employee.PersonID === initial.LastEditedBy) && !catalogErrors.employees && employees.length > 0 ? 'El último editor registrado no es empleado. Seleccione uno para guardar.' : undefined} />
//                   <TextField label="Días para pagar" name="paymentDays" type="number" inputMode="numeric" min={0} step={1} defaultValue={initial?.DiasGraciaPago} required error={fieldErrors.paymentDays} />
//                 </div>
//                 <Separator />
//                 <div className="grid gap-5 sm:grid-cols-3">
//                   <TextField label="Teléfono" name="phoneNumber" type="tel" maxLength={20} defaultValue={initial?.Telefono} required error={fieldErrors.phoneNumber} />
//                   <TextField label="Fax" name="faxNumber" type="tel" maxLength={20} defaultValue={initial?.Fax ?? ''} error={fieldErrors.faxNumber} />
//                   <TextField label="Sitio web" name="websiteURL" type="url" maxLength={256} placeholder="https://ejemplo.com" defaultValue={initial?.SitioWeb ?? ''} error={fieldErrors.websiteURL} />
//                 </div>
//               </FieldGroup>
//             </StepPanel>
//
//             <StepPanel step={STEPS[1]} index={1} active={form.step === 1}>
//               <FieldGroup>
//                 <div className="space-y-2">
//                   <LookupPicker id="billTo" label="Cliente por facturar" placeholder={editing ? 'Se factura a sí mismo' : 'El nuevo cliente se factura a sí mismo'} value={billTo} onChange={(value) => { setBillTo(value); clearError('billTo') }} search={findBillTo} disabled={submitting} sessionAware error={fieldErrors.billTo ?? fieldErrors.billToCustomerID} />
//                   <FieldDescription>Si no selecciona otro cliente, {editing ? 'este cliente' : 'el nuevo cliente'} se factura a sí mismo.</FieldDescription>
//                 </div>
//                 <Separator />
//                 <div className="grid gap-5 sm:grid-cols-2">
//                   <TextField label="Descuento estándar (%)" name="standardDiscountPercentage" type="number" min={0} max={100} step="0.001" defaultValue={initial?.PorcentajeDescuentoEstandar ?? 0} error={fieldErrors.standardDiscountPercentage} />
//                   <TextField label="Límite de crédito" name="creditLimit" type="number" min={0} step="0.01" defaultValue={initial?.LimiteCredito ?? ''} description="Déjelo vacío si el cliente no tiene límite." error={fieldErrors.creditLimit} />
//                 </div>
//                 <div className="grid gap-3 sm:grid-cols-2">
//                   <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 p-4 has-data-checked:border-primary/40 has-data-checked:bg-primary/5">
//                     <Checkbox checked={statementSent} disabled={submitting} onCheckedChange={setStatementSent} className="mt-0.5" />
//                     <span className="space-y-0.5"><span className="block text-sm font-medium">Enviar estados de cuenta</span><span className="block text-xs text-muted-foreground">El cliente recibe estados de cuenta periódicos.</span></span>
//                   </label>
//                   <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 p-4 has-data-checked:border-destructive/40 has-data-checked:bg-destructive/5">
//                     <Checkbox checked={creditHold} disabled={submitting} onCheckedChange={setCreditHold} className="mt-0.5" />
//                     <span className="space-y-0.5"><span className="block text-sm font-medium">Crédito suspendido</span><span className="block text-xs text-muted-foreground">Bloquea nuevas ventas a crédito.</span></span>
//                   </label>
//                 </div>
//               </FieldGroup>
//             </StepPanel>
//
//             <StepPanel step={STEPS[2]} index={2} active={form.step === 2}>
//               <div className="grid gap-5 md:grid-cols-2">
//                 <LookupPicker id="primaryContact" label="Contacto principal" placeholder="Seleccione una persona" value={primaryContact} onChange={(value) => { setPrimaryContact(value); clearError('primaryContact') }} search={findPeople} disabled={submitting} required sessionAware error={fieldErrors.primaryContact ?? fieldErrors.primaryContactPersonID} />
//                 <LookupPicker id="alternateContact" label="Contacto alternativo" placeholder="Sin contacto alternativo" value={alternateContact} onChange={(value) => { setAlternateContact(value); clearError('alternateContact') }} search={findPeople} disabled={submitting} sessionAware error={fieldErrors.alternateContact ?? fieldErrors.alternateContactPersonID} />
//               </div>
//             </StepPanel>
//
//             <StepPanel step={STEPS[3]} index={3} active={form.step === 3}>
//               <div className="space-y-6">
//                 <div className="grid gap-6 md:grid-cols-2">
//                   <FieldSet className="rounded-lg border bg-muted/30 p-4">
//                     <FieldLegend>Dirección de entrega</FieldLegend>
//                     <TextField label="Dirección, línea 1" name="deliveryAddressLine1" maxLength={60} defaultValue={initial?.DireccionEntrega1} required error={fieldErrors.deliveryAddressLine1} />
//                     <TextField label="Dirección, línea 2" name="deliveryAddressLine2" maxLength={60} defaultValue={initial?.DireccionEntrega2 ?? ''} error={fieldErrors.deliveryAddressLine2} />
//                     <LookupPicker id="deliveryCity" label="Ciudad de entrega" placeholder="Seleccione una ciudad" value={deliveryCity} onChange={(value) => { setDeliveryCity(value); clearError('deliveryCity') }} search={findCities} disabled={submitting} required sessionAware error={fieldErrors.deliveryCity ?? fieldErrors.deliveryCityID} />
//                     <TextField label="Código postal" name="deliveryPostalCode" maxLength={10} defaultValue={initial?.CodigoPostalEntrega} required error={fieldErrors.deliveryPostalCode} />
//                   </FieldSet>
//                   <FieldSet className="rounded-lg border bg-muted/30 p-4">
//                     <FieldLegend>Dirección postal</FieldLegend>
//                     <TextField label="Dirección, línea 1" name="postalAddressLine1" maxLength={60} defaultValue={initial?.DireccionPostal1} required error={fieldErrors.postalAddressLine1} />
//                     <TextField label="Dirección, línea 2" name="postalAddressLine2" maxLength={60} defaultValue={initial?.DireccionPostal2 ?? ''} error={fieldErrors.postalAddressLine2} />
//                     <FieldDescription>La ciudad y el código postal serán los mismos que en la dirección de entrega.</FieldDescription>
//                   </FieldSet>
//                 </div>
//                 <FieldSet>
//                   <FieldLegend>Ubicación de entrega</FieldLegend>
//                   <FieldDescription>Opcional. Si proporciona coordenadas, indique ambas.</FieldDescription>
//                   <div className="grid gap-5 sm:grid-cols-2">
//                     <TextField label="Latitud" name="latitude" type="number" min={-90} max={90} step="any" defaultValue={initial?.Latitud ?? ''} error={fieldErrors.latitude} />
//                     <TextField label="Longitud" name="longitude" type="number" min={-180} max={180} step="any" defaultValue={initial?.Longitud ?? ''} error={fieldErrors.longitude} />
//                   </div>
//                 </FieldSet>
//               </div>
//             </StepPanel>
//
//             <StepPanel step={STEPS[4]} index={4} active={form.isReview}>
//               <ReviewSections steps={STEPS} onEdit={form.goTo} sections={[
//                 { step: 0, items: [['Nombre', review.customerName], ['Categoría', nameOf(categories, 'CustomerCategoryID', 'NombreCategoria', customerCategoryID)], ['Grupo de compra', nameOf(groups, 'BuyingGroupID', 'NombreGrupoCompra', buyingGroupID) ?? 'Sin grupo'], ['Método de entrega', nameOf(methods, 'DeliveryMethodID', 'NombreMetodoEntrega', deliveryMethodID)], [editing ? 'Empleado a cargo' : 'Empleado que registra', nameOf(employees, 'PersonID', 'NombreCompleto', lastEditedBy)], ['Días para pagar', review.paymentDays], ['Teléfono', review.phoneNumber], ['Fax', review.faxNumber], ['Sitio web', review.websiteURL]] },
//                 { step: 1, items: [['Cliente por facturar', billTo?.label ?? (editing ? 'Se factura a sí mismo' : 'El nuevo cliente')], ['Descuento estándar', review.standardDiscountPercentage ? `${review.standardDiscountPercentage} %` : '0 %'], ['Límite de crédito', review.creditLimit ? `$${moneyFormatter.format(Number(review.creditLimit))}` : 'Sin límite'], ['Estados de cuenta', statementSent ? 'Se envían' : 'No se envían'], ['Crédito', creditHold ? 'Suspendido' : 'Activo']] },
//                 { step: 2, items: [['Contacto principal', primaryContact?.label], ['Contacto alternativo', alternateContact?.label ?? 'Sin contacto alternativo']] },
//                 { step: 3, items: [['Entrega', [review.deliveryAddressLine1, review.deliveryAddressLine2].filter(Boolean).join(', ')], ['Ciudad', deliveryCity?.label], ['Código postal', review.deliveryPostalCode], ['Postal', [review.postalAddressLine1, review.postalAddressLine2].filter(Boolean).join(', ')], ['Coordenadas', review.latitude && review.longitude ? `${review.latitude}, ${review.longitude}` : null]] },
//               ]} />
//             </StepPanel>
//
//             <StepActions step={form.step} total={STEPS.length} backHref={back} onBack={() => form.goTo(form.step - 1)} submitting={submitting} saveDisabled={catalogsPending || catalogsFailed} saveLabel={editing ? 'Guardar cambios' : 'Crear cliente'} />
//           </fieldset>
//         </form>
//       </div>
//     </main>
//   )
// }
