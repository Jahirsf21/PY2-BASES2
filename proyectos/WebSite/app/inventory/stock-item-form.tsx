'use client'

import type { SubmitEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BoxesIcon, CircleCheckIcon, InfoIcon, ListIcon } from 'lucide-react'
import { getEmployees } from '@/app/api/application'
import { getSuppliers } from '@/app/api/suppliers'
import { createStockItem, getColors, getPackageTypes, getStockGroups, updateStockItemByID } from '@/app/api/stockItems'
import { LookupPicker, type LookupOption } from '@/app/customers/lookup-picker'
import { FormStepper, StepPanel, type FormStep } from '@/components/form-stepper'
import { FormAlerts, FormHeader, InlineError, RequiredMark, ReviewSections, SCROLL_LIST_CLASS, SelectField, StepActions, TextField, serverFieldErrors, useStepForm } from '@/components/form-kit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BackLink } from '@/components/detail-kit'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/toast'
import { checkId, validateStockItem } from '@/lib/helpers/entityValidation'
import { validateSchema } from '@/lib/helpers/validation'
import { stockItemStepSchema } from '@/lib/schemas/forms'
import { arrayResponseSchema } from '@/lib/schemas/responses'
import { useSession } from '@/components/auth-session'
import type { Employee } from '@/lib/types/application'
import type { Color, NewStockItem, PackageType, StockGroup, StockItemEdit, StockItemUpdate } from '@/lib/types/stockItems'

const STEPS: FormStep[] = [
  { id: 'general', title: 'Datos generales', description: 'Nombre, proveedor, responsable del registro y datos de identificación.' },
  { id: 'classification', title: 'Clasificación y empaque', description: 'Grupos del producto, color y forma en que se empaca.' },
  { id: 'pricing', title: 'Precios y entrega', description: 'Precios, impuesto y días de entrega del proveedor.' },
  { id: 'review', title: 'Revisión', description: 'Compruebe la información antes de guardar.' },
]

const FIELD_STEP: Record<string, number> = {
  stockItemName: 0, supplier: 0, supplierID: 0, lastEditedBy: 0, brand: 0, size: 0, barcode: 0, isChillerStock: 0,
  stockGroupIDs: 1, colorID: 1, unitPackageID: 1, outerPackageID: 1, quantityPerOuter: 1, typicalWeightPerUnit: 1,
  unitPrice: 2, taxRate: 2, recommendedRetailPrice: 2, leadTimeDays: 2,
}

const moneyFormatter = new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** Formatea un monto del formulario como moneda para la revisión. */
const money = (value: string | undefined) => value ? `$${moneyFormatter.format(Number(value))}` : null

/** Busca proveedores por nombre para el selector del formulario. */
async function findSuppliers(query: string, page: number) {
  const result = await getSuppliers(query, null, null, page, 8)
  return { items: result.data.map((supplier) => ({ id: supplier.SupplierID, label: supplier.NombreProveedor })), totalPages: result.totalPages }
}

/** Conserva el mensaje de negocio sin mostrar errores internos o cerrar sesión por un 403. */
function stockFormError(reason: unknown): string {
  const status = reason instanceof Error ? reason.cause : null
  if (status === 403) return 'Sin permisos para realizar esta operación de inventario.'
  if (reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503)) return 'No fue posible completar la operación. Compruebe el resultado antes de repetirla.'
  return reason instanceof Error ? reason.message : 'No fue posible completar la operación.'
}

/** Formulario del catálogo del producto; al editar recibe los grupos, la versión y cómo recargar la precarga. */
export function StockItemForm({ initial, onReload }: { initial?: StockItemEdit; onReload?: () => void }) {
  const router = useRouter()
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const [supplier, setSupplier] = useState<LookupOption | null>(initial ? { id: initial.SupplierID, label: initial.SupplierName } : null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [colors, setColors] = useState<Color[]>([])
  const [packages, setPackages] = useState<PackageType[]>([])
  const [groups, setGroups] = useState<StockGroup[]>([])
  const [lastEditedBy, setLastEditedBy] = useState<number | null>(initial?.LastEditedBy ?? null)
  const [colorID, setColorID] = useState<number | null>(initial?.ColorID ?? null)
  const [unitPackageID, setUnitPackageID] = useState<number | null>(initial?.UnitPackageID ?? null)
  const [outerPackageID, setOuterPackageID] = useState<number | null>(initial?.OuterPackageID ?? null)
  const [stockGroupIDs, setStockGroupIDs] = useState<number[]>(initial?.Grupos.map((group) => group.StockGroupID) ?? [])
  const [isChillerStock, setIsChillerStock] = useState(Boolean(initial?.IsChillerStock))
  const [catalogMessage, setCatalogMessage] = useState<string | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogRefresh, setCatalogRefresh] = useState(0)
  const catalogError = Boolean(catalogMessage) || catalogLoading
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<{ id: number; name: string } | null>(null)
  const submitLock = useRef(false)
  const lifetime = useRef({ active: false })
  const back = initial ? `/inventory/${initial.StockItemID}` : '/inventory'

  const { formRef, topRef, ...form } = useStepForm({
    steps: STEPS,
    editing: Boolean(initial),
    stepOf: key => FIELD_STEP[key],
    customErrors: index => validateSchema(stockItemStepSchema(index, { employees, groups }), {
      supplier, lastEditedBy, stockGroupIDs, unitPackageID, outerPackageID,
    }).errors,
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
    /** Mantiene cada catálogo identificado y procesa sus 401 de forma independiente. */
    function catalog<T>(request: Promise<T[]>, label: string, required = true): Promise<T[]> {
      return request.then(items => {
        if (!arrayResponseSchema.safeParse(items).success) throw new SyntaxError('Catálogo inesperado')
        if (required && !items.length) throw new Error(`No hay ${label} disponibles.`)
        return items
      }).catch(reason => {
        if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); throw reason }
        throw new Error(`${label}: ${stockFormError(reason)}`)
      })
    }
    queueMicrotask(() => {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setCatalogLoading(true)
      setCatalogMessage(null)
      Promise.all([catalog(getEmployees(), 'empleados'), catalog(getColors(), 'colores', false), catalog(getPackageTypes(), 'empaques'), catalog(getStockGroups(), 'grupos')])
      .then(([people, availableColors, availablePackages, availableGroups]) => {
        if (cancelled || !isSessionCurrent(requestRevision)) return
        setEmployees(people)
        setColors(availableColors)
        setPackages(availablePackages)
        setGroups(availableGroups)
        setLastEditedBy((id) => people.some((person) => person.PersonID === id) ? id : null)
      }).catch(reason => {
        if (cancelled || !isSessionCurrent(requestRevision)) return
        setCatalogMessage(stockFormError(reason))
      })
      .finally(() => { if (!cancelled && isSessionCurrent(requestRevision)) setCatalogLoading(false) })
    })
    return () => { cancelled = true }
  }, [catalogRefresh, revision, isSessionCurrent, invalidateSession])

  /** Muestra el error del guardado en un toast; ante un conflicto de versión ofrece recargar el producto. */
  function showError(message: string, conflict: boolean) {
    toast.add({
      type: 'error',
      title: initial ? 'No se pudo guardar el producto' : 'No se pudo crear el producto',
      description: message,
      priority: 'high',
      timeout: 8000,
      actionProps: conflict && onReload ? { children: 'Recargar producto', onClick: onReload } : undefined,
    })
  }

  /** Bloquea doble envío y evita publicar mutaciones de otra pantalla o sesión. */
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.isReview) { form.next(); return }
    const requestRevision = revision
    const screen = lifetime.current
    if (submitting || submitLock.current || catalogError || !screen.active || !isSessionCurrent(requestRevision)) return
    const stepErrors = form.allErrors()
    if (Object.keys(stepErrors).length > 0 || !supplier || !unitPackageID || !outerPackageID || !lastEditedBy) {
      form.showErrorsAt(stepErrors)
      return
    }
    const data = new FormData(event.currentTarget)
    /** Lee un campo del formulario como texto sin espacios en los extremos. */
    const text = (field: string) => String(data.get(field) ?? '').trim()
    /** Lee un campo del formulario como número. */
    const number = (field: string) => Number(text(field))
    /** Lee un campo numérico opcional; vacío devuelve null. */
    const optionalNumber = (field: string) => text(field) ? number(field) : null
    const catalog: NewStockItem = {
      stockItemName: text('stockItemName'), supplierID: supplier.id, lastEditedBy,
      unitPackageID, outerPackageID, stockGroupIDs, colorID, isChillerStock,
      leadTimeDays: number('leadTimeDays'), quantityPerOuter: number('quantityPerOuter'),
      unitPrice: number('unitPrice'), taxRate: number('taxRate'),
      recommendedRetailPrice: optionalNumber('recommendedRetailPrice'), typicalWeightPerUnit: optionalNumber('typicalWeightPerUnit'),
      brand: text('brand') || null, size: text('size') || null, barcode: text('barcode') || null,
    }
    const item: NewStockItem | StockItemUpdate = initial ? { ...catalog, version: initial.Version } : catalog
    const { fields, errors } = validateStockItem(item)
    if (fields.length) { form.showErrorsAt(Object.fromEntries(fields.map(field => [field, errors[field]]))); return }
    if (!isSessionCurrent(requestRevision)) return
    submitLock.current = true
    setSubmitting(true)
    try {
      const id = initial ? (await updateStockItemByID(initial.StockItemID, { ...catalog, version: initial.Version }), initial.StockItemID) : await createStockItem(catalog)
      if (!screen.active || !isSessionCurrent(requestRevision)) return
      const idErrors: Record<string, string> = {}
      checkId(idErrors, 'id', 'Producto', id, true)
      if (idErrors.id) throw new SyntaxError('Identificador inesperado')
      // El catálogo se guarda en Corporativo y llega a la sucursal por replicación, con un posible atraso.
      if (!initial) {
        setCreated({ id, name: catalog.stockItemName })
        setSubmitting(false)
        return
      }
      toast.add({ type: 'success', title: 'Producto actualizado', description: `${catalog.stockItemName}. Los cambios pueden tardar unos segundos en verse en la sucursal.` })
      router.push(`/inventory/${id}`)
    } catch (reason) {
      if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); return }
      if (!screen.active || !isSessionCurrent(requestRevision)) return
      let message = reason instanceof TypeError || reason instanceof SyntaxError ? 'No fue posible confirmar el guardado. Compruebe el resultado antes de volver a enviarlo.' : stockFormError(reason)
      const serverErrors = serverFieldErrors(reason)
      if (Object.keys(serverErrors).length) message += ` ${Object.values(serverErrors).join(' ')}`
      if (Object.keys(serverErrors).some(key => key in FIELD_STEP)) form.showErrorsAt(serverErrors)
      showError(message, reason instanceof Error && reason.cause === 409)
      setSubmitting(false)
    } finally {
      submitLock.current = false
    }
  }

  const packageOptions = packages.map((pack) => ({ value: pack.PackageTypeID, label: pack.PackageTypeName }))
  /** Obtiene el nombre de un empaque por su identificador. */
  const packageName = (id: number | null) => packages.find((pack) => pack.PackageTypeID === id)?.PackageTypeName ?? null
  const review = form.review

  if (created) return <StockItemCreated id={created.id} name={created.name} />

  return (
    <main className="flex min-w-0 flex-1 bg-muted/40">
      <div ref={topRef} className="mx-auto w-full max-w-4xl scroll-mt-4 space-y-6 px-4 pt-6 sm:px-8 sm:pt-8">
        <FormHeader backHref={back} backLabel={initial ? 'Volver al detalle' : 'Volver al inventario'} title={initial ? 'Editar producto' : 'Nuevo producto'}
          description={initial ? <>Modificando <span className="font-medium text-foreground">{initial.StockItemName}</span>. Puede saltar a cualquier paso.</> : 'Complete los pasos. Los campos marcados con * son obligatorios.'} />

        <FormStepper steps={STEPS} current={form.step} invalid={form.invalidSteps} completed={index => index < form.visited} canSelect={index => index <= form.visited && !submitting} onSelect={form.goTo} />

        <FormAlerts loading={catalogLoading} errors={catalogMessage ? [catalogMessage] : []} onRetry={() => setCatalogRefresh(key => key + 1)} retryDisabled={catalogLoading || submitting} />

        <form ref={formRef} noValidate className="space-y-6" onSubmit={(event) => void handleSubmit(event)} onInput={form.onInput}>
          <fieldset disabled={submitting} className="min-w-0">
            <StepPanel step={STEPS[0]} index={0} active={form.step === 0}>
              <FieldGroup>
                <TextField label="Nombre del producto" name="stockItemName" maxLength={100} defaultValue={initial?.StockItemName} required error={fieldErrors.stockItemName} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <LookupPicker id="supplier" label="Proveedor" placeholder="Seleccione un proveedor" value={supplier} onChange={(value) => { setSupplier(value); clearError('supplier') }} search={findSuppliers} disabled={submitting || catalogError} required sessionAware error={fieldErrors.supplier ?? fieldErrors.supplierID} />
                  <SelectField id="lastEditedBy" label={initial ? 'Empleado a cargo de la actualización' : 'Empleado que registra'} placeholder="Seleccione un empleado" value={lastEditedBy} onChange={(value) => { setLastEditedBy(value); clearError('lastEditedBy') }} options={employees.map((employee) => ({ value: employee.PersonID, label: employee.NombreCompleto }))} disabled={catalogError || submitting} error={fieldErrors.lastEditedBy}
                    hint={initial && !employees.some((employee) => employee.PersonID === initial.LastEditedBy) && !catalogMessage && employees.length > 0 ? 'El último editor registrado no es empleado. Seleccione uno para guardar.' : undefined} />
                </div>
                <Separator />
                <div className="grid gap-5 sm:grid-cols-3">
                  <TextField label="Marca" name="brand" maxLength={50} defaultValue={initial?.Brand ?? ''} error={fieldErrors.brand} />
                  <TextField label="Talla" name="size" maxLength={20} defaultValue={initial?.Size ?? ''} error={fieldErrors.size} />
                  <TextField label="Código de barras" name="barcode" maxLength={50} defaultValue={initial?.Barcode ?? ''} error={fieldErrors.barcode} />
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 p-4 has-data-checked:border-primary/40 has-data-checked:bg-primary/5">
                  <Checkbox checked={isChillerStock} disabled={submitting} onCheckedChange={setIsChillerStock} className="mt-0.5" />
                  <span className="space-y-0.5"><span className="block text-sm font-medium">Requiere refrigeración</span><span className="block text-xs text-muted-foreground">El producto se almacena en cámara fría.</span></span>
                </label>
              </FieldGroup>
            </StepPanel>

            <StepPanel step={STEPS[1]} index={1} active={form.step === 1}>
              <FieldGroup>
                <FieldSet>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLegend id="stock-groups-label" className={fieldErrors.stockGroupIDs ? 'text-destructive' : undefined}>Grupos de productos<RequiredMark required /></FieldLegend>
                    {stockGroupIDs.length > 0 && <Badge variant="secondary">{stockGroupIDs.length} seleccionado{stockGroupIDs.length === 1 ? '' : 's'}</Badge>}
                  </div>
                  <div role="group" aria-labelledby="stock-groups-label" data-invalid={Boolean(fieldErrors.stockGroupIDs) || undefined} className="rounded-lg border data-invalid:border-destructive">
                    <ScrollArea className={SCROLL_LIST_CLASS}>
                      <div className="grid gap-1 p-2 sm:grid-cols-2">
                        {groups.map((group) => (
                          <label key={group.StockGroupID} className="flex min-w-0 cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted has-data-checked:bg-muted/60 has-data-checked:font-medium">
                            <Checkbox
                              checked={stockGroupIDs.includes(group.StockGroupID)}
                              disabled={submitting || catalogError}
                              onCheckedChange={(checked) => { clearError('stockGroupIDs'); setStockGroupIDs((previous) => checked
                                ? previous.includes(group.StockGroupID) ? previous : [...previous, group.StockGroupID]
                                : previous.filter((id) => id !== group.StockGroupID)) }}
                              className="mt-0.5"
                            />
                            <span className="min-w-0 break-words">{group.NombreGrupoProducto}</span>
                          </label>
                        ))}
                        {catalogLoading && <p className="px-2 py-1.5 text-sm text-muted-foreground">Cargando grupos...</p>}
                      </div>
                    </ScrollArea>
                  </div>
                  {fieldErrors.stockGroupIDs ? <InlineError message={fieldErrors.stockGroupIDs} /> : <FieldDescription>Seleccione uno o varios grupos para este producto.</FieldDescription>}
                </FieldSet>
                <Separator />
                <div className="grid gap-5 sm:grid-cols-3">
                  <SelectField id="colorID" label="Color" placeholder="Sin color" required={false} noneLabel="Sin color" value={colorID} onChange={setColorID} options={colors.map((color) => ({ value: color.ColorID, label: color.ColorName }))} disabled={catalogError || submitting} error={fieldErrors.colorID} />
                  <SelectField id="unitPackageID" label="Empaque unitario" placeholder="Seleccione un empaque" value={unitPackageID} onChange={(value) => { setUnitPackageID(value); clearError('unitPackageID') }} options={packageOptions} disabled={catalogError || submitting} error={fieldErrors.unitPackageID} />
                  <SelectField id="outerPackageID" label="Empaque exterior" placeholder="Seleccione un empaque" value={outerPackageID} onChange={(value) => { setOuterPackageID(value); clearError('outerPackageID') }} options={packageOptions} disabled={catalogError || submitting} error={fieldErrors.outerPackageID} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField label="Unidades por empaque" name="quantityPerOuter" type="number" min={1} step={1} defaultValue={initial?.QuantityPerOuter ?? 1} error={fieldErrors.quantityPerOuter} />
                  <TextField label="Peso por unidad" name="typicalWeightPerUnit" type="number" min={0} step="0.001" defaultValue={initial?.TypicalWeightPerUnit ?? ''} error={fieldErrors.typicalWeightPerUnit} />
                </div>
              </FieldGroup>
            </StepPanel>

            <StepPanel step={STEPS[2]} index={2} active={form.step === 2}>
              <FieldGroup>
                <FieldSet>
                  <FieldLegend>Precios e impuesto</FieldLegend>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField label="Precio unitario" name="unitPrice" type="number" min={0} step="0.01" defaultValue={initial?.UnitPrice ?? 0} required error={fieldErrors.unitPrice} />
                    <TextField label="Impuesto (%)" name="taxRate" type="number" min={0} step="0.001" defaultValue={initial?.TaxRate ?? 0} required error={fieldErrors.taxRate} />
                    <TextField label="Precio recomendado" name="recommendedRetailPrice" type="number" min={0} step="0.01" defaultValue={initial?.RecommendedRetailPrice ?? ''} error={fieldErrors.recommendedRetailPrice} />
                    <TextField label="Días de entrega" name="leadTimeDays" type="number" min={0} step={1} defaultValue={initial?.LeadTimeDays ?? 1} error={fieldErrors.leadTimeDays} />
                  </div>
                  <FieldDescription>Las existencias, la ubicación y el último costo se ajustan por sucursal desde el detalle del producto.</FieldDescription>
                </FieldSet>
              </FieldGroup>
            </StepPanel>

            <StepPanel step={STEPS[3]} index={3} active={form.isReview}>
              <ReviewSections steps={STEPS} onEdit={form.goTo} sections={[
                { step: 0, items: [['Nombre', review.stockItemName], ['Proveedor', supplier?.label], [initial ? 'Empleado a cargo' : 'Empleado que registra', employees.find((employee) => employee.PersonID === lastEditedBy)?.NombreCompleto], ['Marca', review.brand], ['Talla', review.size], ['Código de barras', review.barcode], ['Refrigeración', isChillerStock ? 'Requerida' : 'No requerida']] },
                { step: 1, items: [['Grupos', groups.filter((group) => stockGroupIDs.includes(group.StockGroupID)).map((group) => group.NombreGrupoProducto).join(', ')], ['Color', colors.find((color) => color.ColorID === colorID)?.ColorName ?? 'Sin color'], ['Empaque unitario', packageName(unitPackageID)], ['Empaque exterior', packageName(outerPackageID)], ['Unidades por empaque', review.quantityPerOuter], ['Peso por unidad', review.typicalWeightPerUnit]] },
                { step: 2, items: [['Precio unitario', money(review.unitPrice)], ['Impuesto', review.taxRate ? `${review.taxRate} %` : null], ['Precio recomendado', money(review.recommendedRetailPrice)], ['Días de entrega', review.leadTimeDays]] },
              ]} />
            </StepPanel>

            <StepActions step={form.step} total={STEPS.length} backHref={back} onBack={() => form.goTo(form.step - 1)} submitting={submitting} saveDisabled={catalogError} saveLabel={initial ? 'Guardar cambios' : 'Crear producto'} />
          </fieldset>
        </form>
      </div>
    </main>
  )
}

/** Confirmación del alta: el producto llega a la sucursal por replicación antes de registrar su ubicación y existencias. */
function StockItemCreated({ id, name }: { id: number; name: string }) {
  return (
    <main className="flex min-w-0 flex-1 bg-muted/40">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
        <BackLink href="/inventory">Volver al inventario</BackLink>
        <Card className="gap-0 py-0 shadow-sm">
          <div className="flex flex-col items-center gap-4 border-b px-4 py-8 text-center sm:px-8 sm:py-10">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CircleCheckIcon className="size-7" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Producto #{id}</p>
              <h1 className="text-xl font-semibold tracking-tight break-words sm:text-2xl">{name}</h1>
              <p role="status" className="text-sm text-muted-foreground">Producto creado en el catálogo central.</p>
            </div>
          </div>
          <div className="space-y-5 px-4 py-5 sm:px-8 sm:py-6">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p>Cuando esté disponible en la sucursal podrá registrar su ubicación y existencias. La llegada del catálogo puede tardar unos segundos.</p>
            </div>
            {/* En móvil los botones se apilan a ancho completo con la acción principal arriba; desde sm quedan en fila a la derecha. */}
            <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
              <Button nativeButton={false} className="w-full sm:w-auto" render={<Link href={`/inventory/${id}/holdings`} />}><BoxesIcon data-icon="inline-start" />Registrar ubicación y existencias</Button>
              <Button nativeButton={false} variant="outline" className="w-full sm:w-auto" render={<Link href="/inventory" />}><ListIcon data-icon="inline-start" />Volver al inventario</Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}
