'use client'

import type { SubmitEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RotateCcwIcon, SaveIcon } from 'lucide-react'
import { z } from 'zod'
import { getEmployees } from '@/app/api/application'
import { adjustStockItemHoldings, getStockItemHoldings } from '@/app/api/stockItems'
import { FormHeader, SelectField, TextField, serverFieldErrors } from '@/components/form-kit'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FieldDescription, FieldGroup } from '@/components/ui/field'
import { toast } from '@/components/ui/toast'
import { useSession } from '@/components/auth-session'
import { parseEntityId, validateStockItemHoldings } from '@/lib/helpers/entityValidation'
import { arrayResponseSchema, rowWithIdSchema } from '@/lib/schemas/responses'
import { versionSchema } from '@/lib/schemas/stockItems'
import type { Employee } from '@/lib/types/application'
import type { StockItemHoldings, StockItemHoldingsUpdate } from '@/lib/types/stockItems'

/** Esquema de las existencias leídas: el producto solicitado, su cantidad y su versión o null. */
function holdingsResponseSchema(id: number) {
  return rowWithIdSchema('StockItemID', id).and(z.looseObject({ QuantityOnHand: z.number(), Version: versionSchema.nullable() }))
}

/** Cantidad de reintentos mientras el producto todavía no llega a la sucursal por replicación. */
const ARRIVAL_ATTEMPTS = 10
/** Espera en milisegundos entre esos reintentos. */
const ARRIVAL_DELAY_MS = 3000

/** Conserva el mensaje de negocio sin mostrar errores internos ni cerrar sesión por un 403. */
function holdingsError(reason: unknown): string {
  const status = reason instanceof Error ? reason.cause : null
  if (status === 403) return 'Sin permisos para ajustar existencias.'
  if (reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503)) return 'No fue posible completar la operación. Compruebe el resultado antes de repetirla.'
  return reason instanceof Error ? reason.message : 'No fue posible completar la operación.'
}

/** Página para ajustar las existencias de un producto en la sucursal. */
export default function StockItemHoldingsPage() {
  const { stockItemID } = useParams<{ stockItemID: string }>()
  return <StockItemHoldingsContent key={stockItemID} stockItemID={stockItemID} />
}

/** Ajusta las existencias de la sucursal de la sesión con su propia versión, separada del catálogo. */
function StockItemHoldingsContent({ stockItemID }: { stockItemID: string }) {
  const router = useRouter()
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const [holdings, setHoldings] = useState<StockItemHoldings | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [lastEditedBy, setLastEditedBy] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [arrivalAttempt, setArrivalAttempt] = useState(0)
  const arrivalAttempts = useRef(0)
  const submitLock = useRef(false)
  const lifetime = useRef({ active: false })
  const back = `/inventory/${stockItemID}`

  useEffect(() => {
    const screen = { active: true }
    lifetime.current = screen
    return () => { screen.active = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    let arrivalTimer: ReturnType<typeof setTimeout> | undefined
    const requestRevision = revision
    /** Procesa el 401 de cualquiera de las dos lecturas aunque la otra falle antes. */
    function failed(reason: unknown): never {
      if (reason instanceof Error && reason.cause === 401) invalidateSession(requestRevision)
      throw reason
    }
    queueMicrotask(async () => {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setHoldings(null)
      setLoadError(null)
      setFieldErrors({})
      const id = parseEntityId(stockItemID)
      if (id === null) { setLoadError('Producto no encontrado'); return }
      try {
        const [current, people] = await Promise.all([getStockItemHoldings(id).catch(failed), getEmployees().catch(failed)])
        if (cancelled || !isSessionCurrent(requestRevision)) return
        if (!holdingsResponseSchema(id).safeParse(current).success || !arrayResponseSchema.safeParse(people).success) throw new SyntaxError('Existencias inesperadas')
        setEmployees(people)
        setLastEditedBy(selected => people.some(person => person.PersonID === selected) ? selected : null)
        arrivalAttempts.current = 0
        setArrivalAttempt(0)
        setHoldings(current)
      } catch (reason) {
        if (cancelled || !isSessionCurrent(requestRevision) || (reason instanceof Error && reason.cause === 401)) return
        // Un 404 indica que el producto todavía no llegó a la sucursal; se reintenta solo durante un tiempo limitado.
        if (reason instanceof Error && reason.cause === 404 && arrivalAttempts.current < ARRIVAL_ATTEMPTS) {
          arrivalAttempts.current += 1
          setArrivalAttempt(arrivalAttempts.current)
          arrivalTimer = setTimeout(() => setRefreshKey(key => key + 1), ARRIVAL_DELAY_MS)
          return
        }
        arrivalAttempts.current = 0
        setArrivalAttempt(0)
        setLoadError(holdingsError(reason))
      }
    })
    return () => { cancelled = true; clearTimeout(arrivalTimer) }
  }, [stockItemID, refreshKey, revision, isSessionCurrent, invalidateSession])

  /** Bloquea el doble envío y envía la versión leída; un 409 pide recargar sin reintentar solo. */
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const requestRevision = revision
    const screen = lifetime.current
    if (!holdings || submitting || submitLock.current || !screen.active || !isSessionCurrent(requestRevision)) return
    const data = new FormData(event.currentTarget)
    /** Lee un campo del formulario como texto sin espacios en los extremos. */
    const text = (field: string) => String(data.get(field) ?? '').trim()
    /** Lee un campo numérico; vacío devuelve NaN para que la validación lo rechace. */
    const number = (field: string) => text(field) ? Number(text(field)) : Number.NaN
    if (!lastEditedBy) { setFieldErrors({ lastEditedBy: 'Seleccione un empleado.' }); return }
    const update: StockItemHoldingsUpdate = {
      lastEditedBy,
      quantityOnHand: number('quantityOnHand'),
      binLocation: text('binLocation') || null,
      lastCostPrice: number('lastCostPrice'),
      reorderLevel: number('reorderLevel'),
      targetStockLevel: number('targetStockLevel'),
      version: holdings.Version,
    }
    const { fields, errors } = validateStockItemHoldings(update)
    if (fields.length) { setFieldErrors(Object.fromEntries(fields.map(field => [field, errors[field]]))); return }
    submitLock.current = true
    setSubmitting(true)
    setFieldErrors({})
    try {
      await adjustStockItemHoldings(holdings.StockItemID, update)
      if (!screen.active || !isSessionCurrent(requestRevision)) return
      toast.add({ type: 'success', title: 'Existencias actualizadas', description: holdings.StockItemName })
      router.push(back)
    } catch (reason) {
      if (reason instanceof Error && reason.cause === 401) { invalidateSession(requestRevision); return }
      if (!screen.active || !isSessionCurrent(requestRevision)) return
      const serverErrors = serverFieldErrors(reason)
      if (Object.keys(serverErrors).length) setFieldErrors(serverErrors)
      const conflict = reason instanceof Error && reason.cause === 409
      toast.add({
        type: 'error',
        title: 'No se pudieron guardar las existencias',
        description: holdingsError(reason),
        priority: 'high',
        timeout: 8000,
        // Ante un conflicto de versión ofrece recargar los valores actuales en lugar de reintentar solo.
        actionProps: conflict ? { children: 'Recargar existencias', onClick: () => setRefreshKey(key => key + 1) } : undefined,
      })
      setSubmitting(false)
    } finally {
      submitLock.current = false
    }
  }

  /** Muestra un valor nulo como campo vacío. */
  const value = (amount: number | null | undefined) => amount ?? ''

  return (
    <main className="flex min-w-0 flex-1 bg-muted/40">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
        <FormHeader backHref={back} backLabel="Volver al detalle" title="Ajustar existencias"
          description={holdings ? <>Existencias de <span className="font-medium text-foreground">{holdings.StockItemName}</span> en esta sucursal.</> : 'Existencias del producto en esta sucursal.'} />

        {!holdings && !loadError && (
          <p role="status" className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            {arrivalAttempt > 0
              ? `El producto todavía no está disponible en esta sucursal. Esperando a que llegue (intento ${arrivalAttempt} de ${ARRIVAL_ATTEMPTS})...`
              : 'Cargando existencias...'}
          </p>
        )}
        {loadError && (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <p role="alert" className="text-sm text-destructive">{loadError}</p>
            {parseEntityId(stockItemID) !== null && <Button type="button" variant="outline" onClick={() => { arrivalAttempts.current = 0; setRefreshKey(key => key + 1) }}><RotateCcwIcon data-icon="inline-start" />Reintentar</Button>}
          </div>
        )}

        {holdings && !loadError && (
          <>
            <Card>
              <CardContent>
                <form key={holdings.Version ?? 'sin-fila'} noValidate onSubmit={(event) => void handleSubmit(event)}>
                  <fieldset disabled={submitting} className="min-w-0">
                    <FieldGroup>
                      {holdings.Version === null && <FieldDescription>El producto todavía no tiene existencias registradas en esta sucursal. Al guardar se crea su registro.</FieldDescription>}
                      <SelectField id="lastEditedBy" label="Empleado a cargo del ajuste" placeholder="Seleccione un empleado" value={lastEditedBy}
                        onChange={(id) => { setLastEditedBy(id); setFieldErrors(errors => { const next = { ...errors }; delete next.lastEditedBy; return next }) }}
                        options={employees.map(employee => ({ value: employee.PersonID, label: employee.NombreCompleto }))} disabled={submitting} error={fieldErrors.lastEditedBy} />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <TextField label="Cantidad disponible" name="quantityOnHand" type="number" min={0} step={1} defaultValue={holdings.QuantityOnHand} required error={fieldErrors.quantityOnHand} />
                        <TextField label="Ubicación en bodega" name="binLocation" maxLength={20} defaultValue={holdings.BinLocation ?? ''} error={fieldErrors.binLocation} />
                        <TextField label="Último costo" name="lastCostPrice" type="number" min={0} step="0.01" defaultValue={value(holdings.LastCostPrice)} required error={fieldErrors.lastCostPrice} />
                        <TextField label="Nivel de reposición" name="reorderLevel" type="number" min={0} step={1} defaultValue={value(holdings.ReorderLevel)} required error={fieldErrors.reorderLevel} />
                        <TextField label="Nivel objetivo" name="targetStockLevel" type="number" min={0} step={1} defaultValue={value(holdings.TargetStockLevel)} required error={fieldErrors.targetStockLevel} />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={submitting}><SaveIcon data-icon="inline-start" />{submitting ? 'Guardando...' : 'Guardar existencias'}</Button>
                      </div>
                    </FieldGroup>
                  </fieldset>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  )
}
