'use client'

import type { SubmitEvent } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, ChevronDownIcon } from 'lucide-react'
import { getEmployees } from '@/app/api/application'
import { getSuppliers } from '@/app/api/suppliers'
import { createStockItem, getColors, getPackageTypes, getStockGroups, updateStockItemByID } from '@/app/api/stockItems'
import { LookupPicker, type LookupOption } from '@/app/customers/lookup-picker'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ui/toast'
import { validateStockItem } from '@/lib/helpers/entityValidation'
import type { Employee } from '@/lib/types/application'
import type { Color, NewStockItem, PackageType, StockGroup, StockItemEdit } from '@/lib/types/stockItems'

const dropdownClass = 'flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

async function findSuppliers(query: string, page: number) {
  const result = await getSuppliers(query, null, null, page, 8)
  return { items: result.data.map((supplier) => ({ id: supplier.SupplierID, label: supplier.NombreProveedor })), totalPages: result.totalPages }
}

function TextField({ label, name, required, ...props }: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return <div className="grid min-w-0 gap-2"><Label htmlFor={name}>{label}{required ? ' *' : ''}</Label><Input id={name} name={name} required={required} {...props} /></div>
}

function SelectField({ label, name, value, onChange, options, required = false, disabled = false }: {
  label: string; name: string; value: number | null; onChange: (value: number | null) => void
  options: { id: number; label: string }[]; required?: boolean; disabled?: boolean
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={name}>{label}{required ? ' *' : ''}</Label>
      <DropdownMenu>
        <DropdownMenuTrigger id={name} type="button" disabled={disabled} className={dropdownClass}>
          <span className="min-w-0 truncate">{options.find((option) => option.id === value)?.label ?? (required ? 'Seleccione una opción' : 'Sin asignar')}</span>
          <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-w-[calc(100vw-2rem)] overflow-hidden p-0">
          <ScrollArea className="h-48 max-h-(--available-height)">
            <DropdownMenuRadioGroup value={value === null ? '' : String(value)} onValueChange={(selected) => onChange(selected === '' ? null : Number(selected))} className="p-1">
              {!required && <DropdownMenuRadioItem value="" closeOnClick>Sin asignar</DropdownMenuRadioItem>}
              {options.map((option) => <DropdownMenuRadioItem key={option.id} value={String(option.id)} closeOnClick>{option.label}</DropdownMenuRadioItem>)}
            </DropdownMenuRadioGroup>
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function StockItemForm({ initial, initialGroups = [] }: { initial?: StockItemEdit; initialGroups?: StockGroup[] }) {
  const router = useRouter()
  const [supplier, setSupplier] = useState<LookupOption | null>(initial ? { id: initial.SupplierID, label: initial.SupplierName } : null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [colors, setColors] = useState<Color[]>([])
  const [packages, setPackages] = useState<PackageType[]>([])
  const [groups, setGroups] = useState<StockGroup[]>([])
  const [lastEditedBy, setLastEditedBy] = useState<number | null>(initial?.LastEditedBy ?? null)
  const [colorID, setColorID] = useState<number | null>(initial?.ColorID ?? null)
  const [unitPackageID, setUnitPackageID] = useState<number | null>(initial?.UnitPackageID ?? null)
  const [outerPackageID, setOuterPackageID] = useState<number | null>(initial?.OuterPackageID ?? null)
  const [stockGroupIDs, setStockGroupIDs] = useState<number[]>(initialGroups.map((group) => group.StockGroupID))
  const [isChillerStock, setIsChillerStock] = useState(Boolean(initial?.IsChillerStock))
  const [catalogError, setCatalogError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const back = initial ? `/inventory/${initial.StockItemID}` : '/inventory'

  useEffect(() => {
    let cancelled = false
    Promise.all([getEmployees(), getColors(), getPackageTypes(), getStockGroups()])
      .then(([people, availableColors, availablePackages, availableGroups]) => {
        if (cancelled) return
        setEmployees(people)
        setColors(availableColors)
        setPackages(availablePackages)
        setGroups(availableGroups)
        setLastEditedBy((id) => people.some((person) => person.PersonID === id) ? id : null)
      }).catch(() => {
        if (cancelled) return
        setCatalogError(true)
        toast.add({ type: 'error', title: 'No se pudieron cargar las opciones del producto', description: 'No fue posible cargar las opciones del formulario. Recargue la página.', priority: 'high', timeout: 8000 })
      })
    return () => { cancelled = true }
  }, [])

  function showError(message: string) {
    toast.add({ type: 'error', title: 'Revise el producto', description: message, priority: 'high', timeout: 8000 })
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    if (!supplier || !unitPackageID || !outerPackageID || !lastEditedBy || !employees.some((person) => person.PersonID === lastEditedBy) ||
      stockGroupIDs.length === 0 || stockGroupIDs.some((id) => !groups.some((group) => group.StockGroupID === id))) {
      showError('Seleccione proveedor, empaques, al menos un grupo de productos y un empleado válido.')
      return
    }
    const data = new FormData(event.currentTarget)
    const text = (field: string) => String(data.get(field) ?? '').trim()
    const number = (field: string) => Number(text(field))
    const optionalNumber = (field: string) => text(field) ? number(field) : null
    const item: NewStockItem = {
      stockItemName: text('stockItemName'), supplierID: supplier.id, lastEditedBy,
      unitPackageID, outerPackageID, stockGroupIDs, colorID, isChillerStock,
      leadTimeDays: number('leadTimeDays'), quantityPerOuter: number('quantityPerOuter'),
      quantityOnHand: number('quantityOnHand'), reorderLevel: number('reorderLevel'),
      targetStockLevel: number('targetStockLevel'), lastCostPrice: number('lastCostPrice'),
      unitPrice: number('unitPrice'), taxRate: number('taxRate'),
      recommendedRetailPrice: optionalNumber('recommendedRetailPrice'), typicalWeightPerUnit: optionalNumber('typicalWeightPerUnit'),
      brand: text('brand') || null, size: text('size') || null, barcode: text('barcode') || null, binLocation: text('binLocation') || null,
    }
    const {fields, errors} = validateStockItem(item)
    if (fields.length) { showError(errors[fields[0]]); return }
    setSubmitting(true)
    try {
      const id = initial ? (await updateStockItemByID(initial.StockItemID, item), initial.StockItemID) : await createStockItem(item)
      toast.add({ type: 'success', title: initial ? 'Producto actualizado' : 'Producto creado', description: item.stockItemName })
      router.push(`/inventory/${id}`)
    } catch (reason) {
      showError(reason instanceof Error ? reason.message : 'No fue posible guardar el producto')
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
        <Link href={back} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeftIcon className="size-4" aria-hidden="true" /> {initial ? 'Volver al detalle' : 'Volver al inventario'}
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{initial ? 'Editar producto' : 'Crear producto'}</h1>
          <p className="text-sm text-muted-foreground">Complete los datos obligatorios marcados con *.</p>
        </div>
        <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
          <fieldset disabled={submitting} className="space-y-6">
            <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Datos generales</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Nombre del producto" name="stockItemName" maxLength={100} defaultValue={initial?.StockItemName} required />
                <SelectField label={initial ? 'Empleado a cargo de la actualización' : 'Empleado que registra'} name="lastEditedBy" value={lastEditedBy} onChange={setLastEditedBy} options={employees.map((employee) => ({ id: employee.PersonID, label: employee.NombreCompleto }))} disabled={catalogError} required />
                <SelectField label="Color" name="colorID" value={colorID} onChange={setColorID} options={colors.map((color) => ({ id: color.ColorID, label: color.ColorName }))} disabled={catalogError} />
                <SelectField label="Empaque unitario" name="unitPackageID" value={unitPackageID} onChange={setUnitPackageID} options={packages.map((pack) => ({ id: pack.PackageTypeID, label: pack.PackageTypeName }))} disabled={catalogError} required />
                <SelectField label="Empaque exterior" name="outerPackageID" value={outerPackageID} onChange={setOuterPackageID} options={packages.map((pack) => ({ id: pack.PackageTypeID, label: pack.PackageTypeName }))} disabled={catalogError} required />
                <TextField label="Marca" name="brand" maxLength={50} defaultValue={initial?.Brand ?? ''} />
                <TextField label="Talla" name="size" maxLength={20} defaultValue={initial?.Size ?? ''} />
                <TextField label="Código de barras" name="barcode" maxLength={50} defaultValue={initial?.Barcode ?? ''} />
              </div>
              <div className="min-w-0 space-y-2">
                <p id="stock-groups-label" className="text-sm font-medium">Grupos de productos *</p>
                <div role="group" aria-labelledby="stock-groups-label" className="rounded-lg border">
                  <ScrollArea className="h-40">
                    <div className="grid gap-1 p-3 sm:grid-cols-2">
                      {groups.map((group) => (
                        <label key={group.StockGroupID} className="flex min-w-0 cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                          <Checkbox
                            checked={stockGroupIDs.includes(group.StockGroupID)}
                            disabled={submitting || catalogError}
                            onCheckedChange={(checked) => setStockGroupIDs((previous) => checked
                              ? previous.includes(group.StockGroupID) ? previous : [...previous, group.StockGroupID]
                              : previous.filter((id) => id !== group.StockGroupID))}
                            className="mt-0.5"
                          />
                          <span className="min-w-0 break-words">{group.NombreGrupoProducto}</span>
                        </label>
                      ))}
                      {!catalogError && groups.length === 0 && <p className="text-sm text-muted-foreground">Cargando grupos...</p>}
                    </div>
                  </ScrollArea>
                </div>
                <p className="text-xs text-muted-foreground">Seleccione uno o varios grupos para este producto.</p>
              </div>
              <LookupPicker id="supplier" label="Proveedor" value={supplier} onChange={setSupplier} search={findSuppliers} disabled={submitting || catalogError} required />
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={isChillerStock} disabled={submitting} onCheckedChange={setIsChillerStock} /> Requiere refrigeración</label>
            </section>
            <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Precios y existencias</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <TextField label="Precio unitario" name="unitPrice" type="number" min={0} step="0.01" defaultValue={initial?.UnitPrice ?? 0} required />
                <TextField label="Impuesto (%)" name="taxRate" type="number" min={0} step="0.001" defaultValue={initial?.TaxRate ?? 0} required />
                <TextField label="Precio recomendado" name="recommendedRetailPrice" type="number" min={0} step="0.01" defaultValue={initial?.RecommendedRetailPrice ?? ''} />
                <TextField label="Último costo" name="lastCostPrice" type="number" min={0} step="0.01" defaultValue={initial?.LastCostPrice ?? 0} />
                <TextField label="Cantidad disponible" name="quantityOnHand" type="number" min={0} step={1} defaultValue={initial?.QuantityOnHand ?? 0} required />
                <TextField label="Nivel de reposición" name="reorderLevel" type="number" min={0} step={1} defaultValue={initial?.ReorderLevel ?? 0} />
                <TextField label="Nivel objetivo" name="targetStockLevel" type="number" min={0} step={1} defaultValue={initial?.TargetStockLevel ?? 0} />
                <TextField label="Días de entrega" name="leadTimeDays" type="number" min={0} step={1} defaultValue={initial?.LeadTimeDays ?? 1} />
                <TextField label="Unidades por empaque" name="quantityPerOuter" type="number" min={1} step={1} defaultValue={initial?.QuantityPerOuter ?? 1} />
                <TextField label="Peso por unidad" name="typicalWeightPerUnit" type="number" min={0} step="0.001" defaultValue={initial?.TypicalWeightPerUnit ?? ''} />
                <TextField label="Ubicación en bodega" name="binLocation" maxLength={20} defaultValue={initial?.BinLocation ?? ''} />
              </div>
            </section>
            <div className="flex flex-wrap justify-end gap-2">
              <Button nativeButton={false} render={<Link href={back} />} variant="outline">Cancelar</Button>
              <Button type="submit" disabled={submitting || catalogError}>{submitting ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear producto'}</Button>
            </div>
          </fieldset>
        </form>
      </div>
    </main>
  )
}
