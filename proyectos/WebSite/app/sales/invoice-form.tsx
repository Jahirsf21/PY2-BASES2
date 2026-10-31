'use client'

import type { SubmitEvent } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, ChevronDownIcon } from 'lucide-react'
import { getDeliveryMethods, getEmployees, getPeople, getSalespeople } from '@/app/api/application'
import { getBillToCustomers } from '@/app/api/customers'
import { createInvoice, updateInvoiceByID } from '@/app/api/sales'
import { getStockItemByID, getStockItems } from '@/app/api/stockItems'
import { LookupPicker, type LookupOption } from '@/app/customers/lookup-picker'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ui/toast'
import { validateInvoice } from '@/lib/helpers/entityValidation'
import type { Employee } from '@/lib/types/application'
import type { DeliveryMethod } from '@/lib/types/deliveryMethods'
import type { InvoiceEdit, InvoiceLine, NewInvoice } from '@/lib/types/sales'

const dropdownClass = 'flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

function SelectField({ label, id, value, onChange, options, disabled }: {
  label: string; id: string; value: number | null; onChange: (value: number) => void
  options: { id: number; label: string }[]; disabled: boolean
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{label} *</Label>
      <DropdownMenu>
        <DropdownMenuTrigger id={id} type="button" disabled={disabled} className={dropdownClass}>
          <span className="min-w-0 truncate">{options.find((option) => option.id === value)?.label ?? 'Seleccione una opción'}</span>
          <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-w-[calc(100vw-2rem)] overflow-hidden p-0">
          <ScrollArea className="h-48 max-h-(--available-height)">
            <DropdownMenuRadioGroup value={value === null ? '' : String(value)} onValueChange={(selected) => onChange(Number(selected))} className="p-1">
              {options.map((option) => <DropdownMenuRadioItem key={option.id} value={String(option.id)} closeOnClick>{option.label}</DropdownMenuRadioItem>)}
            </DropdownMenuRadioGroup>
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

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

export function InvoiceForm({initial, initialLines = []}: {initial?: InvoiceEdit; initialLines?: InvoiceLine[]}) {
  const router = useRouter()
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
  const [catalogError, setCatalogError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const back = header ? `/sales/${header.InvoiceID}` : '/sales'

  useEffect(() => {
    let cancelled = false
    Promise.all([getDeliveryMethods(), getEmployees(), getSalespeople()]).then(([deliveryMethods, people, sellers]) => {
      if (cancelled) return
      setMethods(deliveryMethods)
      setEmployees(people)
      setSalespeople(sellers)
    }).catch(() => {
      if (cancelled) return
      setCatalogError(true)
      toast.add({ type: 'error', title: 'No se pudieron cargar las opciones de la factura', description: 'No fue posible cargar las opciones del formulario. Recargue la página.', priority: 'high', timeout: 8000 })
    })
    return () => { cancelled = true }
  }, [])

  function showError(message: string) {
    toast.add({type: 'error', title: 'Revise la factura', description: message, priority: 'high', timeout: 8000})
  }

  function updateLine(key: number, changes: Partial<EditableLine>) {
    setLines((previous) => previous.map((line) => line.key === key ? {...line, ...changes} : line))
  }

  async function selectProduct(key: number, product: LookupOption | null) {
    updateLine(key, {product, unitPrice: ''})
    if (!product) return
    try {
      const detail = await getStockItemByID(product.id)
      if (!detail[0]) throw new Error('Producto no encontrado')
      setLines((previous) => previous.map((line) => line.key === key && line.product?.id === product.id ? {...line, unitPrice: String(detail[0].PrecioUnitario)} : line))
    } catch { showError('No fue posible consultar el precio del producto. Ingréselo manualmente.') }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    if (!customer || !contact || !deliveryMethodID || !accountsPersonID || !packedByPersonID || !lastEditedBy || !salespersonPersonID ||
      ![accountsPersonID, packedByPersonID, lastEditedBy].every((id) => employees.some((person) => person.PersonID === id)) ||
      !salespeople.some((person) => person.PersonID === salespersonPersonID)) {
      showError('Seleccione cliente, contacto, método de entrega, empleados y vendedor válidos.')
      return
    }
    if (lines.length === 0 || lines.some((line) => !line.product)) { showError('Agregue al menos un producto válido a la factura.'); return }
    const data = new FormData(event.currentTarget)
    const text = (field: string) => String(data.get(field) ?? '').trim()
    const invoice: NewInvoice = {
      customerID: customer.id, billToCustomerID: billTo?.id ?? null, deliveryMethodID,
      contactPersonID: contact.id, accountsPersonID, packedByPersonID, lastEditedBy, salespersonPersonID,
      customerPurchaseOrderNumber: text('customerPurchaseOrderNumber') || null,
      invoiceDate: text('invoiceDate'), deliveryInstructions: text('deliveryInstructions') || null,
      lines: lines.map((line) => ({stockItemID: line.product!.id, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice)})),
    }
    // Los campos numéricos vacíos no deben convertirse silenciosamente a cero.
    if (lines.some((line) => !line.quantity.trim() || !line.unitPrice.trim())) { showError('Indique cantidad y precio en cada línea.'); return }
    const {fields, errors} = validateInvoice(invoice)
    if (fields.length) { showError(errors[fields[0]]); return }
    setSubmitting(true)
    try {
      const id = header ? (await updateInvoiceByID(header.InvoiceID, invoice), header.InvoiceID) : await createInvoice(invoice)
      toast.add({type: 'success', title: header ? 'Factura actualizada' : 'Factura creada', description: `Factura #${id}`})
      router.push(`/sales/${id}`)
    } catch (reason) {
      showError(reason instanceof Error ? reason.message : 'No fue posible guardar la factura')
      setSubmitting(false)
    }
  }

  const employeeOptions = employees.map((employee) => ({ id: employee.PersonID, label: employee.NombreCompleto }))

  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
        <Link href={back} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeftIcon className="size-4" aria-hidden="true" /> {header ? 'Volver al detalle' : 'Volver a ventas'}
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{header ? 'Editar factura' : 'Crear factura'}</h1>
          <p className="text-sm text-muted-foreground">Complete los datos obligatorios marcados con *.</p>
        </div>
        <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
          <fieldset disabled={submitting} className="space-y-6">
            <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Datos generales</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <LookupPicker id="customer" label="Cliente" value={customer} onChange={setCustomer} search={findCustomers} disabled={submitting || catalogError} required />
                <div className="min-w-0"><LookupPicker id="billTo" label="Cliente por facturar" value={billTo} onChange={setBillTo} search={findCustomers} disabled={submitting || catalogError} /><p className="mt-1 text-xs text-muted-foreground">Si no se selecciona, se factura al cliente principal.</p></div>
                <LookupPicker id="contact" label="Contacto" value={contact} onChange={setContact} search={findPeople} disabled={submitting || catalogError} required />
                <SelectField id="deliveryMethodID" label="Método de entrega" value={deliveryMethodID} onChange={setDeliveryMethodID} options={methods.map((method) => ({ id: method.DeliveryMethodID, label: method.NombreMetodoEntrega }))} disabled={catalogError} />
                <SelectField id="accountsPersonID" label="Responsable de cuentas" value={accountsPersonID} onChange={setAccountsPersonID} options={employeeOptions} disabled={catalogError} />
                <SelectField id="packedByPersonID" label="Empaquetado por" value={packedByPersonID} onChange={setPackedByPersonID} options={employeeOptions} disabled={catalogError} />
                <SelectField id="lastEditedBy" label={header ? 'Empleado a cargo de la actualización' : 'Empleado que registra'} value={lastEditedBy} onChange={setLastEditedBy} options={employeeOptions} disabled={catalogError} />
                <SelectField id="salespersonPersonID" label="Vendedor" value={salespersonPersonID} onChange={setSalespersonPersonID} options={salespeople.map((seller) => ({ id: seller.PersonID, label: seller.NombreCompleto }))} disabled={catalogError} />
                <div className="grid min-w-0 gap-2"><Label htmlFor="invoiceDate">Fecha de factura *</Label><Input id="invoiceDate" name="invoiceDate" type="date" defaultValue={header?.InvoiceDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} required /></div>
                <div className="grid min-w-0 gap-2"><Label htmlFor="customerPurchaseOrderNumber">Número de orden</Label><Input id="customerPurchaseOrderNumber" name="customerPurchaseOrderNumber" maxLength={20} defaultValue={header?.CustomerPurchaseOrderNumber ?? ''} /></div>
              </div>
            </section>
            <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Entrega</h2>
              <div className="grid min-w-0 gap-2"><Label htmlFor="deliveryInstructions">Instrucciones de entrega</Label><Input id="deliveryInstructions" name="deliveryInstructions" maxLength={100} defaultValue={header?.DeliveryInstructions ?? ''} /></div>
            </section>
            <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Líneas de producto</h2>
                <Button type="button" variant="outline" onClick={() => setLines((previous) => [...previous, { key: nextLineKey++, product: null, quantity: '1', unitPrice: '' }])}>Agregar línea</Button>
              </div>
              {lines.map((line, index) => (
                <div key={line.key} className="min-w-0 rounded-lg border p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">Línea {index + 1}</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => setLines((previous) => previous.filter((entry) => entry.key !== line.key))}>Quitar</Button>
                  </div>
                  <LookupPicker id={`product-${line.key}`} label="Producto" value={line.product} onChange={(option) => void selectProduct(line.key, option)} search={findProducts} disabled={submitting || catalogError} required />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="grid min-w-0 gap-2"><Label htmlFor={`quantity-${line.key}`}>Cantidad *</Label><Input id={`quantity-${line.key}`} type="number" min={1} step={1} required value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} /></div>
                    <div className="grid min-w-0 gap-2"><Label htmlFor={`price-${line.key}`}>Precio unitario *</Label><Input id={`price-${line.key}`} type="number" min={0} step="0.01" required value={line.unitPrice} onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })} /></div>
                  </div>
                </div>
              ))}
            </section>
            <div className="flex flex-wrap justify-end gap-2">
              <Button nativeButton={false} render={<Link href={back} />} variant="outline">Cancelar</Button>
              <Button type="submit" disabled={submitting || catalogError}>{submitting ? 'Guardando...' : header ? 'Guardar cambios' : 'Crear factura'}</Button>
            </div>
          </fieldset>
        </form>
      </div>
    </main>
  )
}
