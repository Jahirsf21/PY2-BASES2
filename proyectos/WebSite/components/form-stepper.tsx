'use client'

import type { ReactNode } from 'react'
import { CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface FormStep {
  id: string
  title: string
  description: string
}

interface FormStepperProps {
  steps: FormStep[]
  current: number
  /** Pasos con errores pendientes, marcados en rojo. */
  invalid?: number[]
  /** Indica si el usuario puede saltar directamente a un paso. */
  canSelect: (index: number) => boolean
  onSelect: (index: number) => void
  /** Pasos ya validados. */
  completed: (index: number) => boolean
}

/** Indicador de progreso accesible: lista numerada en escritorio y barra compacta en móvil. */
export function FormStepper({ steps, current, invalid = [], canSelect, onSelect, completed }: FormStepperProps) {
  const progress = Math.round(((current + 1) / steps.length) * 100)
  return (
    <nav aria-label="Pasos del formulario" className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="md:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium">{steps[current].title}</p>
          <p className="shrink-0 text-xs text-muted-foreground">Paso {current + 1} de {steps.length}</p>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={current + 1} aria-label="Progreso del formulario">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <ol className="hidden items-start md:flex">
        {steps.map((step, index) => {
          const isCurrent = index === current
          const isDone = completed(index) && !isCurrent
          const hasError = invalid.includes(index)
          const selectable = canSelect(index) && !isCurrent
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-start">
              <button
                type="button"
                disabled={!selectable}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => onSelect(index)}
                className="group flex min-w-0 flex-1 flex-col items-center gap-2 rounded-lg px-1 py-1 text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default enabled:cursor-pointer"
              >
                <span className="flex w-full items-center">
                  <span className={cn('h-px flex-1', index === 0 ? 'bg-transparent' : completed(index - 1) || index <= current ? 'bg-primary' : 'bg-border')} />
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                      hasError ? 'border-destructive bg-destructive/10 text-destructive'
                        : isCurrent ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : isDone ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground',
                      selectable && 'group-hover:border-primary',
                    )}
                  >
                    {isDone && !hasError ? <CheckIcon className="size-4" aria-hidden="true" /> : index + 1}
                  </span>
                  <span className={cn('h-px flex-1', index === steps.length - 1 ? 'bg-transparent' : completed(index) ? 'bg-primary' : 'bg-border')} />
                </span>
                <span className={cn('line-clamp-1 text-xs font-medium', isCurrent ? 'text-foreground' : 'text-muted-foreground', hasError && 'text-destructive')}>{step.title}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Contenedor de un paso. Permanece montado (solo oculto) para conservar los valores del formulario. */
export function StepPanel({ step, index, active, children }: { step: FormStep; index: number; active: boolean; children: ReactNode }) {
  return (
    <section hidden={!active} aria-labelledby={`step-${step.id}-title`} data-step={index}>
      <Card className="gap-0 py-0 shadow-sm">
        <CardHeader className="border-b bg-muted/40 py-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Paso {index + 1}</p>
          <CardTitle id={`step-${step.id}-title`} className="text-lg font-semibold">{step.title}</CardTitle>
          <CardDescription>{step.description}</CardDescription>
        </CardHeader>
        <CardContent className="py-6">{children}</CardContent>
      </Card>
    </section>
  )
}
