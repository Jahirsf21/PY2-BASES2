'use client'

import type { FormEvent, ReactNode } from 'react'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { AlertCircleIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon, Loader2Icon, PencilIcon, RotateCcwIcon } from 'lucide-react'
import type { FormStep } from '@/components/form-stepper'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { extractServerFieldErrors } from '@/lib/helpers/apiErrors'

/** Altura máxima de las listas desplegables; el desplazamiento lo gestiona ScrollArea. */
export const SCROLL_LIST_CLASS = '[&>[data-slot=scroll-area-viewport]]:max-h-64'
const NONE = '__none'

/** Marca un campo como obligatorio (*) u opcional. */
export function RequiredMark({ required }: { required?: boolean }) {
  return required
    ? <span className="text-destructive" aria-hidden="true">*</span>
    : <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
}

/** Campo de texto con etiqueta, descripción y error en línea. */
export function TextField({ label, name, required, error, description, ...props }: { label: string; name: string; error?: string; description?: string } & React.ComponentProps<typeof Input>) {
  return (
    <Field data-invalid={Boolean(error) || undefined} className="min-w-0">
      <FieldLabel htmlFor={props.id ?? name}>{label}<RequiredMark required={required} /></FieldLabel>
      <Input id={name} name={name} required={required} aria-invalid={Boolean(error) || undefined} {...props} />
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

/** Select de shadcn con ScrollArea. Si no es obligatorio, agrega una opción para dejarlo vacío. */
export function SelectField({ id, label, placeholder, value, onChange, options, disabled, error, hint, required = true, noneLabel = 'Sin asignar' }: {
  id: string; label: string; placeholder: string; value: number | null; onChange: (value: number | null) => void
  options: { value: number; label: string }[]; disabled?: boolean; error?: string; hint?: string; required?: boolean; noneLabel?: string
}) {
  const items = [...(required ? [] : [{ value: NONE, label: noneLabel }]), ...options.map(option => ({ value: String(option.value), label: option.label }))]
  const selected = value === null ? (required ? null : NONE) : String(value)
  return (
    <Field data-invalid={Boolean(error) || undefined} className="min-w-0">
      <FieldLabel htmlFor={id}>{label}<RequiredMark required={required} /></FieldLabel>
      <Select items={items} value={selected} onValueChange={(next) => { if (next !== null) onChange(next === NONE ? null : Number(next)) }} disabled={disabled}>
        <SelectTrigger id={id} className="w-full min-w-0" aria-invalid={Boolean(error) || undefined}>
          <SelectValue placeholder={placeholder} className="min-w-0 truncate" />
        </SelectTrigger>
        <SelectContent className="overflow-hidden p-0" alignItemWithTrigger={false}>
          <ScrollArea className={SCROLL_LIST_CLASS}>
            <div className="p-1">{items.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</div>
          </ScrollArea>
        </SelectContent>
      </Select>
      {hint && !error && <FieldDescription>{hint}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

/** Mensaje de error en línea para controles que no son Field (combobox, grupos de casillas). */
export function InlineError({ message }: { message?: string }) {
  return message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null
}

/** Encabezado del formulario: enlace de regreso, título y descripción. */
export function FormHeader({ backHref, backLabel, title, description }: { backHref: string; backLabel: string; title: string; description: ReactNode }) {
  return (
    <div className="space-y-3">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"><ArrowLeftIcon className="size-4" aria-hidden="true" />{backLabel}</Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

/** Avisos de carga de catálogos y de errores de guardado. */
export function FormAlerts({ loading, errors, onRetry, retryDisabled, submitError }: { loading: boolean; errors: string[]; onRetry: () => void; retryDisabled: boolean; submitError?: ReactNode }) {
  return (
    <>
      {loading && <p role="status" className="flex items-center gap-2 rounded-lg border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground"><Loader2Icon className="size-4 animate-spin" aria-hidden="true" />Cargando opciones del formulario...</p>}
      {errors.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <ul role="alert" className="space-y-1">
            {errors.map(message => <li key={message} className="flex items-start gap-2 text-sm text-destructive"><AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{message}</li>)}
          </ul>
          <Button type="button" variant="outline" size="sm" disabled={retryDisabled} onClick={onRetry}><RotateCcwIcon data-icon="inline-start" />Reintentar opciones</Button>
        </div>
      )}
      {submitError && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><div className="min-w-0 space-y-1">{submitError}</div></div>}
    </>
  )
}

/** Barra flotante con Cancelar/Anterior, progreso y Siguiente/Guardar. */
export function StepActions({ step, total, backHref, onBack, submitting, saveDisabled, saveLabel }: {
  step: number; total: number; backHref: string; onBack: () => void; submitting: boolean; saveDisabled: boolean; saveLabel: string
}) {
  const last = step === total - 1
  return (
    <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 mt-6 mb-6 sm:mb-8 lg:bottom-4">
      <div className="flex items-center justify-between gap-2 rounded-xl bg-card/95 px-3 py-2.5 shadow-lg ring-1 ring-foreground/10 backdrop-blur supports-backdrop-filter:bg-card/80">
        {step === 0
          ? <Button variant="ghost" nativeButton={false} render={<Link href={backHref} />}>Cancelar</Button>
          : <Button type="button" variant="ghost" onClick={onBack}><ArrowLeftIcon data-icon="inline-start" />Anterior</Button>}
        <span className="hidden text-xs text-muted-foreground sm:block">Paso {step + 1} de {total}</span>
        {!last
          ? <Button type="submit" key="next">Siguiente<ArrowRightIcon data-icon="inline-end" /></Button>
          : <Button type="submit" key="save" disabled={submitting || saveDisabled}>{submitting ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <CheckIcon data-icon="inline-start" />}{submitting ? 'Guardando...' : saveLabel}</Button>}
      </div>
    </div>
  )
}

export interface ReviewSection {
  step: number
  items: [label: string, value: ReactNode][]
  /** Contenido adicional (por ejemplo, una tabla de líneas). */
  extra?: ReactNode
}

/** Resumen por secciones del último paso, con acceso directo a editar cada una. */
export function ReviewSections({ sections, steps, onEdit }: { sections: ReviewSection[]; steps: FormStep[]; onEdit: (step: number) => void }) {
  return (
    <div className="space-y-4">
      {sections.map(section => (
        <div key={section.step} className="overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2">
            <h3 className="text-sm font-semibold">{steps[section.step].title}</h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(section.step)}><PencilIcon data-icon="inline-start" />Editar</Button>
          </div>
          {section.items.length > 0 && (
            <dl className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className={value === null || value === undefined || value === '' ? 'text-sm text-muted-foreground italic' : 'break-words text-sm font-medium'}>{value === null || value === undefined || value === '' ? 'Sin especificar' : value}</dd>
                </div>
              ))}
            </dl>
          )}
          {section.extra}
        </div>
      ))}
    </div>
  )
}

/** Traduce el estado de validez nativo de un campo a un mensaje en español. */
export function nativeMessage(element: HTMLInputElement | HTMLTextAreaElement): string {
  const label = element.labels?.[0]?.textContent?.replace(/\*|\(opcional\)/g, '').trim() || 'Este campo'
  const validity = element.validity
  if (validity.valueMissing) return `${label} es obligatorio.`
  if (validity.typeMismatch) return `${label} no tiene un formato válido.`
  if (validity.badInput) return `${label} debe ser un número.`
  if (validity.rangeUnderflow) return `${label} debe ser mayor o igual a ${element.getAttribute('min')}.`
  if (validity.rangeOverflow) return `${label} debe ser menor o igual a ${element.getAttribute('max')}.`
  if (validity.stepMismatch) return element.getAttribute('step') === '1' ? `${label} debe ser un número entero.` : `${label} tiene demasiados decimales.`
  if (validity.tooLong) return `${label} supera la longitud permitida.`
  return `${label} no es válido.`
}

/**
 * Navegación y validación de un formulario por pasos. Los paneles permanecen montados,
 * así que FormData, el envío y la lógica de negocio del formulario no cambian.
 */
export function useStepForm({ steps, editing, stepOf, customErrors }: {
  steps: FormStep[]
  editing: boolean
  /** Paso al que pertenece una clave de error. */
  stepOf: (key: string) => number | undefined
  /** Errores de controles no nativos (selects, combobox, líneas) para un paso. */
  customErrors: (index: number, data: FormData | null) => Record<string, string>
}) {
  const reviewStep = steps.length - 1
  const [step, setStep] = useState(0)
  const [visited, setVisited] = useState(editing ? reviewStep : 0)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [review, setReview] = useState<Record<string, string>>({})
  const formRef = useRef<HTMLFormElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  /** Quita el error de un campo. */
  function clearError(name: string) {
    setFieldErrors(previous => {
      if (!(name in previous)) return previous
      const next = { ...previous }
      delete next[name]
      return next
    })
  }

  /** Obtiene los errores nativos y propios de los campos de un paso. */
  function stepErrors(index: number): Record<string, string> {
    const errors: Record<string, string> = {}
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-step="${index}"]`)
    panel?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[name], textarea[name]').forEach(element => {
      if (!element.checkValidity() && !errors[element.name]) errors[element.name] = nativeMessage(element)
    })
    return { ...errors, ...customErrors(index, formRef.current ? new FormData(formRef.current) : null) }
  }

  /** Enfoca el primer campo inválido del paso. */
  function focusFirstError(index: number) {
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>(`[data-step="${index}"] [aria-invalid="true"]`)?.focus()
    })
  }

  /** Cambia al paso indicado; al llegar a la revisión guarda los valores del formulario. */
  function goTo(index: number) {
    if (index === reviewStep && formRef.current) setReview(Object.fromEntries([...new FormData(formRef.current)].map(([key, value]) => [key, String(value).trim()])))
    setStep(index)
    setVisited(previous => Math.max(previous, index))
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  /** Valida el paso actual y avanza si no tiene errores. */
  function next() {
    const errors = stepErrors(step)
    setFieldErrors(previous => ({ ...Object.fromEntries(Object.entries(previous).filter(([key]) => stepOf(key) !== step)), ...errors }))
    if (Object.keys(errors).length > 0) { focusFirstError(step); return }
    goTo(step + 1)
  }

  /** Lleva al primer paso con errores y los muestra junto a sus campos. */
  function showErrorsAt(errors: Record<string, string>) {
    const first = Object.keys(errors).map(key => stepOf(key) ?? 0).sort((a, b) => a - b)[0] ?? 0
    setFieldErrors(errors)
    setStep(first)
    focusFirstError(first)
  }

  /** Valida todos los pasos de datos; devuelve los errores encontrados. */
  function allErrors(): Record<string, string> {
    return Object.assign({}, ...steps.slice(0, reviewStep).map((_, index) => stepErrors(index))) as Record<string, string>
  }

  /** Quita el error del campo que el usuario modifica. */
  function onInput(event: FormEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement
    if (target.name) clearError(target.name)
  }

  const invalidSteps = [...new Set(Object.keys(fieldErrors).map(stepOf).filter((index): index is number => index !== undefined))]

  return { step, visited, fieldErrors, review, formRef, topRef, reviewStep, clearError, goTo, next, showErrorsAt, allErrors, onInput, invalidSteps, isReview: step === reviewStep }
}

/** Extrae los errores de campo (400) que devuelve el servidor. */
export function serverFieldErrors(reason: unknown): Record<string, string> {
  return extractServerFieldErrors(reason)
}
