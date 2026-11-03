'use client'

import type { SubmitEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon, PackagePlusIcon, Trash2Icon } from 'lucide-react'
import { getDeliveryMethods, getEmployees, getPeople, getSalespeople } from '@/app/api/application'
import { getBillToCustomers } from '@/app/api/customers'
import { createInvoice, updateInvoiceByID } from '@/app/api/sales'
import { getStockItemByID, getStockItems } from '@/app/api/stockItems'
import { LookupPicker, type LookupOption } from '@/app/customers/lookup-picker'
import { FormStepper, StepPanel, type FormStep } from '@/components/form-stepper'
import { FormAlerts, FormHeader, InlineError, ReviewSections, SelectField, StepActions, TextField, serverFieldErrors, useStepForm } from '@/components/form-kit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { checkId, validateInvoice } from '@/lib/helpers/entityValidation'
import { useSession } from '@/components/auth-session'
import type { Employee } from '@/lib/types/application'
import type { DeliveryMethod } from '@/lib/types/deliveryMethods'
import type { InvoiceEdit, InvoiceLine, NewInvoice } from '@/lib/types/sales'

const STEPS: FormStep[] = [
  { id: 'customer', title: 'Cliente y orden', description: 'Cliente, persona de contacto, fecha y número de orden de compra.' },
  { id: 'staff', title: 'Responsables y entrega', description: 'Empleados que participan en la venta y cómo se entrega.' },
  { id: 'lines', title: 'Productos', description: 'Productos facturados con su cantidad y precio unitario.' },
  { id: 'review', title: 'Revisión', description: 'Compruebe la factura antes de guardar.' },
]

const FIELD_STEP: Record<string, number> = {
  customer: 0, customerID: 0, billTo: 0, billToCustomerID: 0, contact: 0, contactPersonID: 0, invoiceDate: 0, customerPurchaseOrderNumber: 0,
  deliveryMethodID: 1, accountsPersonID: 1, packedByPersonID: 1, lastEditedBy: 1, salespersonPersonID: 1, deliveryInstructions: 1,
}
const stepOf = (key: string) => FIELD_STEP[key] ?? (key.startsWith('line') ? 2 : undefined)

const amountFormatter = new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat('es-CR', { timeZone: 'UTC', dateStyle: 'long' })

async function findCustomers(query: string, page: number) {
  const response = await getBillToCustomers(query, page, 8)
  return {items: response.data.map((item) => ({id: item.CustomerID, label: item.NombreCliente})), totalPages: response.totalPages}
}

async function findPeople(query: string, page: number) {
  const response = await getPeople(query, page, 8)
  return {items: response.data.map((item) => ({id: item.PersonID, label: item.NombreCompleto})), totalPages: response.totalPages}
}

async function findProducts(query: string, page: number) {
  const response = await getStockItems(query, [], page, 8)
  return {items: response.data.map((item) => ({id: item.StockItemID, label: item.NombreProducto})), totalPages: response.totalPages}
}

interface EditableLine { key: number; product: LookupOption | null; quantity: string; unitPrice: string }
let nextLineKey = 1

/** Subtotal de una línea antes de impuestos; el servidor calcula los montos definitivos. */
function lineSubtotal(line: EditableLine) {
  const quantity = Number(line.quantity), price = Number(line.unitPrice)
  return line.quantity.trim() && line.unitPrice.trim() && Number.isFinite(quantity) && Number.isFinite(price) ? quantity * price : null
}

/** Evita exponer detalles internos del transporte y distingue los permisos. */
function invoiceFormError(reason: unknown): string {
  const status = reason instanceof Error ? reason.cause : null
  if (status === 403) return 'Sin permisos para realizar esta operación de ventas.'
  if (reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503)) return 'No fue posible completar la operación. Compruebe el resultado antes de repetirla.'
  return reason instanceof Error ? reason.message : 'No fue posible completar la operación.'
}

export function InvoiceForm({initial, initialLines = []}: {initial?: InvoiceEdit; initialLines?: InvoiceLine[]}) {
  const router = useRouter()
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const header = initial
  const [customer, setCustomer] = useState<LookupOption | null>(header ? {id: header.CustomerID, label: header.CustomerName} : null)
  const [billTo, setBillTo] = useState<LookupOption | null>(header && header.BillToCustomerID !== header.CustomerID ? {id: header.BillToCustomerID, label: header.BillToCustomerName} : null)
  const [contact, setContact] = useState<LookupOption | null>(header ? {id: header.ContactPersonID, label: header.ContactPersonName ?? `Persona #${header.ContactPersonID}`} : null)
  const [methods, setMethods] = useState<DeliveryMethod[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [salespeople, setSalespeople] = useState<Employee[]>([])
  const [deliveryMethodID, setDeliveryMethodID] = useState<number | null>(header?.DeliveryMethodID ?? null)
  const [accountsPersonID, setAccountsPersonID] = useState<number | null>(header?.AccountsPersonID ?? null)
  const [packedByPersonID, setPackedByPersonID] = useState<number | null>(header?.PackedByPersonID ?? null)
  const [lastEditedBy, setLastEditedBy] = useState<number | null>(header?.LastEditedBy ?? null)
  const [salespersonPersonID, setSalespersonPersonID] = useState<number | null>(header?.SalespersonPersonID ?? null)
  const [lines, setLines] = useState<EditableLine[]>(() => initialLines.length ? initialLines.map((line) => ({
    key: nextLineKey++, product: {id: line.StockItemID, label: line.NombreProducto},
    quantity: String(line.Cantidad), unitPrice: String(line.PrecioUnitario),
  })) : [{key: nextLineKey++, product: null, quantity: '1', unitPrice: ''}])
  const [catalogMessage, setCatalogMessage] = useState<string | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogRefresh, setCatalogRefresh] = useState(0)
  const catalogError = Boolean(catalogMessage) || catalogLoading
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const submitLock = useRef(false)
  const lifetime = useRef({ active: false })
  const priceRequests = useRef(new Map<number, object>())
  const [priceLoading, setPriceLoading] = useState<number[]>([])
  const back = header ? `/sales/${header.InvoiceID}` : '/sales'

  const { formRef, topRef, ...form } = useStepForm({
    steps: STEPS,
    editing: Boolean(header),
    stepOf,
    customErrors: (index) => {
      const errors: Record<string, string> = {}
      const isEmployee = (id: number | null) => id !== null && employees.some((person) => person.PersonID === id)
      if (index === 0) {
        if (!customer) errors.customer = 'Seleccione el cliente.'
        if (!contact) errors.contact = 'Seleccione la persona de contacto.'
      }
      if (index === 1) {
        if (!deliveryMethodID) errors.deliveryMethodID = 'Seleccione un método de entrega.'
        if (!isEmployee(accountsPersonID)) errors.accountsPersonID = 'Seleccione un empleado válido.'
        if (!isEmployee(packedByPersonID)) errors.packedByPersonID = 'Seleccione un empleado válido.'
        if (!isEmployee(lastEditedBy)) errors.lastEditedBy = 'Seleccione un empleado válido.'
        if (!salespersonPersonID || !salespeople.some((person) => person.PersonID === salespersonPersonID)) errors.salespersonPersonID = 'Seleccione un vendedor válido.'
      }
      if (index === 2) {
        if (lines.length === 0) errors.lines = 'Agregue al menos un producto a la factura.'
        if (priceLoading.length > 0) errors.lines = 'Espere a que termine la consulta de precios.'
        for (const line of lines) {
          const quantity = Number(line.quantity), price = Number(line.unitPrice)
          if (!line.product) errors[`line:${line.key}:product`] = 'Seleccione un producto.'
          if (!line.quantity.trim() || !Number.isInteger(quantity) || quantity < 1) errors[`line:${line.key}:quantity`] = 'Indique una cantidad entera mayor que 0.'
          if (!line.unitPrice.trim() || !Number.isFinite(price) || price < 0) errors[`line:${line.key}:price`] = 'Indique un precio igual o mayor que 0.'
        }
      }
      return errors
    },
  })
  const { fieldErrors, clearError } = form

  useEffect(() => {
    const screen = { active: true }
    const requests = priceRequests.current
    lifetime.current = screen
    return () => { screen.active = false; requests.clear() }
  }, [])

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision
    /** Cada referencia controla sus 401 aunque ya haya fallado otra petición del lote. */
    function catalog<T>(request: Promise<T[]>, label: string): Promise<T[]> {
      return request.then(items => {
        if (!Array.isArray(items)) throw new SyntaxError('Catálogo inesperado')
        if (!items.length) throw new Error(`No hay ${label} disponibles.`)
        return items
      }).catch(reason => {
        if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); throw reason }
        throw new Error(`${label}: ${invoiceFormError(reason)}`)
      })
    }
    queueMicrotask(() => {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setCatalogLoading(true)
      setCatalogMessage(null)
      Promise.all([catalog(getDeliveryMethods(), 'métodos de entrega'), catalog(getEmployees(), 'empleados'), catalog(getSalespeople(), 'vendedores')]).then(([deliveryMethods, people, sellers]) => {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setMethods(deliveryMethods)
      setEmployees(people)
      setSalespeople(sellers)
    }).catch(reason => {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setCatalogMessage(invoiceFormError(reason))
    })
    .finally(() => { if (!cancelled && isSessionCurrent(requestRevision)) setCatalogLoading(false) })
    })
    return () => { cancelled = true }
  }, [catalogRefresh, revision, isSessionCurrent, invalidateSession])

  function showError(message: string) {
    toast.add({type: 'error', title: 'Revise la factura', description: message, priority: 'high', timeout: 8000})
  }

  function updateLine(key: number, changes: Partial<EditableLine>) {
    setLines((previous) => previous.map((line) => line.key === key ? {...line, ...changes} : line))
    if ('quantity' in changes) clearError(`line:${key}:quantity`)
    if ('unitPrice' in changes) clearError(`line:${key}:price`)
  }

  function addLine() {
    clearError('lines')
    setLines((previous) => [...previous, { key: nextLineKey++, product: null, quantity: '1', unitPrice: '' }])
  }

  function removeLine(key: number) {
    priceRequests.current.delete(key)
    setPriceLoading(previous => previous.filter(value => value !== key))
    setLines((previous) => previous.filter((entry) => entry.key !== key))
  }

  /** No aplica un precio de otra selección, línea eliminada, pantalla o sesión. */
  async function selectProduct(key: number, product: LookupOption | null) {
    const requestRevision = revision
    const screen = lifetime.current
    if (!screen.active || submitting || !isSessionCurrent(requestRevision)) return
    const request = {}
    priceRequests.current.set(key, request)
    updateLine(key, {product, unitPrice: ''})
    clearError(`line:${key}:product`)
    setPriceLoading(previous => previous.filter(value => value !== key))
    if (!product) return
    setPriceLoading(previous => [...previous, key])
    try {
      const detail = await getStockItemByID(product.id)
      if (!screen.active || !isSessionCurrent(requestRevision) || priceRequests.current.get(key) !== request) return
      if (!detail[0] || detail[0].StockItemID !== product.id || typeof detail[0].PrecioUnitario !== 'number' || !Number.isFinite(detail[0].PrecioUnitario)) throw new SyntaxError('Precio inesperado')
      setLines((previous) => previous.map((line) => line.key === key && line.product?.id === product.id ? {...line, unitPrice: String(detail[0].PrecioUnitario)} : line))
      clearError(`line:${key}:price`)
    } catch (reason) {
      if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); return }
      if (screen.active && isSessionCurrent(requestRevision) && priceRequests.current.get(key) === request) showError(`${invoiceFormError(reason)} No fue posible consultar el precio del producto; ingréselo manualmente.`)
    } finally {
      if (screen.active && isSessionCurrent(requestRevision) && priceRequests.current.get(key) === request) setPriceLoading(previous => previous.filter(value => value !== key))
    }
  }

  /** Convierte las claves `lines[i].campo` del validador en errores de la línea correspondiente. */
  function lineErrors(errors: Record<string, string>) {
    return Object.fromEntries(Object.entries(errors).map(([key, message]) => {
      const match = key.match(/^lines\[(\d+)\](?:\.(\w+))?$/)
      if (!match) return [key, message]
      const line = lines[Number(match[1])]
      const field = match[2] === 'stockItemID' ? 'product' : match[2] === 'unitPrice' ? 'price' : match[2] === 'quantity' ? 'quantity' : null
      return line && field ? [`line:${line.key}:${field}`, message] : ['lines', message]
    }))
  }

  /** Guarda una sola vez y publica resultados únicamente en su contexto original. */
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.isReview) { form.next(); return }
    const requestRevision = revision
    const screen = lifetime.current
    if (submitting || submitLock.current || catalogError || priceLoading.length > 0 || !screen.active || !isSessionCurrent(requestRevision)) return
    const stepErrors = form.allErrors()
    if (Object.keys(stepErrors).length > 0 || !customer || !contact || !deliveryMethodID || !accountsPersonID || !packedByPersonID || !lastEditedBy || !salespersonPersonID || lines.length === 0 || lines.some((line) => !line.product)) {
      form.showErrorsAt(stepErrors)
      return
    }
    const data = new FormData(event.currentTarget)
    const text = (field: string) => String(data.get(field) ?? '').trim()
    const invoice: NewInvoice = {
      customerID: customer.id, billToCustomerID: billTo?.id ?? null, deliveryMethodID,
      contactPersonID: contact.id, accountsPersonID, packedByPersonID, lastEditedBy, salespersonPersonID,
      customerPurchaseOrderNumber: text('customerPurchaseOrderNumber') || null,
      invoiceDate: text('invoiceDate'), deliveryInstructions: text('deliveryInstructions') || null,
      lines: lines.map((line) => ({stockItemID: line.product!.id, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice)})),
    }
    const {fields, errors} = validateInvoice(invoice)
    if (fields.length) { form.showErrorsAt(lineErrors(Object.fromEntries(fields.map(field => [field, errors[field]])))); return }
    if (!isSessionCurrent(requestRevision)) return
    submitLock.current = true
    setSubmitting(true)
    setSubmitError(null)
    try {
      const id = header ? (await updateInvoiceByID(header.InvoiceID, invoice), header.InvoiceID) : await createInvoice(invoice)
      if (!screen.active || !isSessionCurrent(requestRevision)) return
      const idErrors: Record<string, string> = {}
      checkId(idErrors, 'id', 'Factura', id, true)
      if (idErrors.id) throw new SyntaxError('Identificador inesperado')
      toast.add({type: 'success', title: header ? 'Factura actualizada' : 'Factura creada', description: `Factura #${id}`})
      router.push(`/sales/${id}`)
    } catch (reason) {
      if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); return }
      if (!screen.active || !isSessionCurrent(requestRevision)) return
      let message = reason instanceof TypeError || reason instanceof SyntaxError ? 'No fue posible confirmar el guardado. Compruebe el resultado antes de volver a enviarlo.' : invoiceFormError(reason)
      const serverErrors = serverFieldErrors(reason)
      if (Object.keys(serverErrors).length) message += ` ${Object.values(serverErrors).join(' ')}`
      const mapped = lineErrors(serverErrors)
      if (Object.keys(mapped).some(key => stepOf(key) !== undefined)) form.showErrorsAt(mapped)
      setSubmitError(message)
      showError(message)
      setSubmitting(false)
    } finally {
      submitLock.current = false
    }
  }

  const employeeOptions = employees.map((employee) => ({ value: employee.PersonID, label: employee.NombreCompleto }))
  const employeeName = (id: number | null) => employees.find((employee) => employee.PersonID === id)?.NombreCompleto ?? null
  const subtotal = lines.reduce((sum, line) => sum + (lineSubtotal(line) ?? 0), 0)
  const review = form.review
  const generalLineErrors = Object.entries(fieldErrors).filter(([key]) => key === 'lines' || key.startsWith('lines[')).map(([, message]) => message)

  return (
    <main className="flex min-w-0 flex-1 bg-muted/40">
      <div ref={topRef} className="mx-auto w-full max-w-4xl scroll-mt-4 space-y-6 px-4 pt-6 sm:px-8 sm:pt-8">
        <FormHeader backHref={back} backLabel={header ? 'Volver al detalle' : 'Volver a ventas'} title={header ? `Editar factura #${header.InvoiceID}` : 'Nueva factura'}
          description={header ? <>Factura de <span className="font-medium text-foreground">{header.CustomerName}</span>. Puede saltar a cualquier paso.</> : 'Complete los pasos. Los campos marcados con * son obligatorios.'} />

        <FormStepper steps={STEPS} current={form.step} invalid={form.invalidSteps} completed={index => index < form.visited} canSelect={index => index <= form.visited && !submitting} onSelect={form.goTo} />

        <FormAlerts loading={catalogLoading} errors={catalogMessage ? [catalogMessage] : []} onRetry={() => setCatalogRefresh(key => key + 1)} retryDisabled={catalogLoading || submitting} submitError={submitError} />

        <form ref={formRef} noValidate className="space-y-6" onSubmit={(event) => void handleSubmit(event)} onInput={form.onInput}>
          <fieldset disabled={submitting} className="min-w-0">
            <StepPanel step={STEPS[0]} index={0} active={form.step === 0}>
              <FieldGroup>
                <div className="grid gap-5 sm:grid-cols-2">
                  <LookupPicker id="customer" label="Cliente" placeholder="Seleccione un cliente" value={customer} onChange={(value) => { setCustomer(value); clearError('customer') }} search={findCustomers} disabled={submitting || catalogError} required sessionAware error={fieldErrors.customer ?? fieldErrors.customerID} />
                  <div className="space-y-2">
                    <LookupPicker id="billTo" label="Cliente por facturar" placeholder="El mismo cliente" value={billTo} onChange={(value) => { setBillTo(value); clearError('billTo') }} search={findCustomers} disabled={submitting || catalogError} sessionAware error={fieldErrors.billTo ?? fieldErrors.billToCustomerID} />
                    <FieldDescription>Si no se selecciona, se factura al cliente principal.</FieldDescription>
                  </div>
                </div>
                <LookupPicker id="contact" label="Contacto" placeholder="Seleccione una persona" value={contact} onChange={(value) => { setContact(value); clearError('contact') }} search={findPeople} disabled={submitting || catalogError} required sessionAware error={fieldErrors.contact ?? fieldErrors.contactPersonID} />
                <Separator />
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField label="Fecha de factura" name="invoiceDate" type="date" defaultValue={header?.InvoiceDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} required error={fieldErrors.invoiceDate} />
                  <TextField label="Número de orden" name="customerPurchaseOrderNumber" maxLength={20} defaultValue={header?.CustomerPurchaseOrderNumber ?? ''} error={fieldErrors.customerPurchaseOrderNumber} />
                </div>
              </FieldGroup>
            </StepPanel>

            <StepPanel step={STEPS[1]} index={1} active={form.step === 1}>
              <FieldGroup>
                <FieldSet>
                  <FieldLegend>Responsables</FieldLegend>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <SelectField id="salespersonPersonID" label="Vendedor" placeholder="Seleccione un vendedor" value={salespersonPersonID} onChange={(value) => { setSalespersonPersonID(value); clearError('salespersonPersonID') }} options={salespeople.map((seller) => ({ value: seller.PersonID, label: seller.NombreCompleto }))} disabled={catalogError || submitting} error={fieldErrors.salespersonPersonID} />
                    <SelectField id="accountsPersonID" label="Responsable de cuentas" placeholder="Seleccione un empleado" value={accountsPersonID} onChange={(value) => { setAccountsPersonID(value); clearError('accountsPersonID') }} options={employeeOptions} disabled={catalogError || submitting} error={fieldErrors.accountsPersonID} />
                    <SelectField id="packedByPersonID" label="Empaquetado por" placeholder="Seleccione un empleado" value={packedByPersonID} onChange={(value) => { setPackedByPersonID(value); clearError('packedByPersonID') }} options={employeeOptions} disabled={catalogError || submitting} error={fieldErrors.packedByPersonID} />
                    <SelectField id="lastEditedBy" label={header ? 'Empleado a cargo de la actualización' : 'Empleado que registra'} placeholder="Seleccione un empleado" value={lastEditedBy} onChange={(value) => { setLastEditedBy(value); clearError('lastEditedBy') }} options={employeeOptions} disabled={catalogError || submitting} error={fieldErrors.lastEditedBy} />
                  </div>
                </FieldSet>
                <Separator />
                <FieldSet>
                  <FieldLegend>Entrega</FieldLegend>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <SelectField id="deliveryMethodID" label="Método de entrega" placeholder="Seleccione un método" value={deliveryMethodID} onChange={(value) => { setDeliveryMethodID(value); clearError('deliveryMethodID') }} options={methods.map((method) => ({ value: method.DeliveryMethodID, label: method.NombreMetodoEntrega }))} disabled={catalogError || submitting} error={fieldErrors.deliveryMethodID} />
                    <TextField label="Instrucciones de entrega" name="deliveryInstructions" maxLength={100} defaultValue={header?.DeliveryInstructions ?? ''} error={fieldErrors.deliveryInstructions} />
                  </div>
                </FieldSet>
              </FieldGroup>
            </StepPanel>

            <StepPanel step={STEPS[2]} index={2} active={form.step === 2}>
              <div className="space-y-4">
                {generalLineErrors.map(message => <InlineError key={message} message={message} />)}
                {lines.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center">
                    <PackagePlusIcon className="size-6 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">La factura no tiene productos.</p>
                  </div>
                )}
                {lines.map((line, index) => {
                  const subtotalLine = lineSubtotal(line)
                  const loadingPrice = priceLoading.includes(line.key)
                  return (
                    <div key={line.key} className="min-w-0 overflow-hidden rounded-lg border">
                      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2">
                        <span className="flex items-center gap-2 text-sm font-semibold"><span className="flex size-6 items-center justify-center rounded-full bg-foreground text-xs text-background">{index + 1}</span>Línea {index + 1}</span>
                        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeLine(line.key)}><Trash2Icon data-icon="inline-start" />Quitar</Button>
                      </div>
                      <div className="space-y-4 p-4">
                        <LookupPicker id={`product-${line.key}`} label="Producto" placeholder="Seleccione un producto" value={line.product} onChange={(option) => void selectProduct(line.key, option)} search={findProducts} disabled={submitting || catalogError} required sessionAware error={fieldErrors[`line:${line.key}:product`]} />
                        <div className="grid gap-4 sm:grid-cols-3">
                          <Field data-invalid={Boolean(fieldErrors[`line:${line.key}:quantity`]) || undefined} className="min-w-0">
                            <FieldLabel htmlFor={`quantity-${line.key}`}>Cantidad<span className="text-destructive" aria-hidden="true">*</span></FieldLabel>
                            <Input id={`quantity-${line.key}`} type="number" inputMode="numeric" min={1} step={1} required value={line.quantity} aria-invalid={Boolean(fieldErrors[`line:${line.key}:quantity`]) || undefined} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} />
                            {fieldErrors[`line:${line.key}:quantity`] && <FieldError>{fieldErrors[`line:${line.key}:quantity`]}</FieldError>}
                          </Field>
                          <Field data-invalid={Boolean(fieldErrors[`line:${line.key}:price`]) || undefined} className="min-w-0">
                            <FieldLabel htmlFor={`price-${line.key}`}>Precio unitario<span className="text-destructive" aria-hidden="true">*</span></FieldLabel>
                            <div className="relative">
                              <Input id={`price-${line.key}`} type="number" min={0} step="0.01" required disabled={loadingPrice} value={line.unitPrice} aria-invalid={Boolean(fieldErrors[`line:${line.key}:price`]) || undefined} onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })} />
                              {loadingPrice && <Loader2Icon className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />}
                            </div>
                            {loadingPrice ? <p role="status" className="text-xs text-muted-foreground">Consultando precio...</p> : fieldErrors[`line:${line.key}:price`] && <FieldError>{fieldErrors[`line:${line.key}:price`]}</FieldError>}
                          </Field>
                          <div className="grid min-w-0 content-start gap-2">
                            <span className="text-sm font-medium">Subtotal</span>
                            <span className="flex h-8 items-center justify-end rounded-lg bg-muted/50 px-2.5 text-sm font-semibold tabular-nums">{subtotalLine === null ? '—' : `$${amountFormatter.format(subtotalLine)}`}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="button" variant="outline" onClick={addLine}><PackagePlusIcon data-icon="inline-start" />Agregar línea</Button>
                  <p className="text-right text-sm text-muted-foreground">Subtotal antes de impuestos: <span className="text-base font-semibold text-foreground tabular-nums">${amountFormatter.format(subtotal)}</span></p>
                </div>
              </div>
            </StepPanel>

            <StepPanel step={STEPS[3]} index={3} active={form.isReview}>
              <ReviewSections steps={STEPS} onEdit={form.goTo} sections={[
                { step: 0, items: [['Cliente', customer?.label], ['Cliente por facturar', billTo?.label ?? 'El mismo cliente'], ['Contacto', contact?.label], ['Fecha', review.invoiceDate ? dateFormatter.format(new Date(review.invoiceDate)) : null], ['Número de orden', review.customerPurchaseOrderNumber]] },
                { step: 1, items: [['Vendedor', salespeople.find((seller) => seller.PersonID === salespersonPersonID)?.NombreCompleto], ['Responsable de cuentas', employeeName(accountsPersonID)], ['Empaquetado por', employeeName(packedByPersonID)], [header ? 'Empleado a cargo' : 'Empleado que registra', employeeName(lastEditedBy)], ['Método de entrega', methods.find((method) => method.DeliveryMethodID === deliveryMethodID)?.NombreMetodoEntrega], ['Instrucciones', review.deliveryInstructions]] },
                { step: 2, items: [], extra: (
                  <Table>
                    <TableHeader className="bg-muted/30"><TableRow className="hover:bg-transparent">
                      <TableHead>Producto</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead className="text-right">Precio</TableHead><TableHead className="text-right">Subtotal</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {lines.map((line) => (
                        <TableRow key={line.key}>
                          <TableCell className="max-w-56 truncate" title={line.product?.label}>{line.product?.label ?? <span className="text-muted-foreground italic">Sin producto</span>}</TableCell>
                          <TableCell className="text-right tabular-nums">{line.quantity || '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{line.unitPrice ? `$${amountFormatter.format(Number(line.unitPrice))}` : '—'}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{lineSubtotal(line) === null ? '—' : `$${amountFormatter.format(lineSubtotal(line)!)}`}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter><TableRow>
                      <TableCell colSpan={3} className="text-right">Subtotal antes de impuestos <Badge variant="outline" className="ml-1">{lines.length} {lines.length === 1 ? 'línea' : 'líneas'}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">${amountFormatter.format(subtotal)}</TableCell>
                    </TableRow></TableFooter>
                  </Table>
                ) },
              ]} />
            </StepPanel>

            <StepActions step={form.step} total={STEPS.length} backHref={back} onBack={() => form.goTo(form.step - 1)} submitting={submitting} saveDisabled={catalogError || priceLoading.length > 0} saveLabel={header ? 'Guardar cambios' : 'Crear factura'} />
          </fieldset>
        </form>
      </div>
    </main>
  )
}
