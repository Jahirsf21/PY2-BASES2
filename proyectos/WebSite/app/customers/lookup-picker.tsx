'use client'

import type { KeyboardEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { AlertCircleIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsUpDownIcon, RotateCcwIcon, SearchIcon, SearchXIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { useSession } from '@/components/auth-session'

/** Opción seleccionable de un catálogo paginado. */
export interface LookupOption {
  id: number
  label: string
}

interface LookupResult {
  items: LookupOption[]
  totalPages: number
}

interface LookupPickerProps {
  id: string
  label: string
  value: LookupOption | null
  onChange: (option: LookupOption | null) => void
  search: (query: string, page: number) => Promise<LookupResult>
  disabled?: boolean
  required?: boolean
  sessionAware?: boolean
  /** Mensaje de validación mostrado bajo el campo. */
  error?: string
  placeholder?: string
}

const SEARCH_DELAY = 300

/** Mantiene el modo anterior de los consumidores que todavía no integran su sesión. */
export function LookupPicker({ sessionAware = false, ...props }: LookupPickerProps) {
  return sessionAware ? <SessionLookupPicker {...props} /> : <LookupPickerContent {...props} />
}

/** Vincula únicamente los selectores que lo solicitan al contexto de sesión vigente. */
function SessionLookupPicker(props: LookupPickerProps) {
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  return <LookupPickerContent {...props} session={{ revision, isSessionCurrent, invalidateSession }} />
}

function initials(text: string) {
  return text.replace(/[^\p{L}\p{N}\s,]/gu, '').split(/[\s,]+/).filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase()).join('') || '?'
}

/**
 * Combobox con búsqueda paginada: el campo muestra la selección y la búsqueda se abre en un panel flotante.
 * Las lecturas solo ocurren con el panel abierto; en modo de sesión conserva errores, reintento y descarte de respuestas tardías.
 */
function LookupPickerContent({ id, label, value, onChange, search, disabled, required, session, error: validationError, placeholder }: LookupPickerProps & {
  session?: Pick<ReturnType<typeof useSession>, 'revision' | 'isSessionCurrent' | 'invalidateSession'>
}) {
  const { revision, isSessionCurrent, invalidateSession } = session ?? {}
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const requestRevision = revision
    /** Comprueba también cambios del almacenamiento que todavía no recibieron foco. */
    const current = () => requestRevision === undefined || Boolean(isSessionCurrent?.(requestRevision))
    async function load() {
      if (cancelled || !current()) return
      setLoading(true)
      setError(null)
      try {
        const data = await search(query, page)
        if (!cancelled && current()) {
          setResult(data)
          setError(null)
        }
      } catch (reason) {
        const status = reason instanceof Error ? reason.cause : null
        if (status === 401 && requestRevision !== undefined) {
          invalidateSession?.(requestRevision)
          return
        }
        if (cancelled || !current()) return
        let message = reason instanceof Error ? reason.message : 'No fue posible buscar'
        if (requestRevision !== undefined) {
          if (status === 403) message = `Sin permisos para consultar ${label.toLowerCase()}.`
          else if (reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503)) message = 'No fue posible buscar. Intente nuevamente.'
          setResult(null)
        } else {
          toast.add({ type: 'error', title: `No se pudo buscar: ${label}`, description: message, priority: 'high', timeout: 8000 })
        }
        setError(message)
      } finally {
        if (!cancelled && current()) setLoading(false)
      }
    }
    queueMicrotask(() => { void load() })
    return () => { cancelled = true }
  }, [open, query, page, search, refreshKey, label, revision, isSessionCurrent, invalidateSession])

  /** Aplica la búsqueda escrita tras una breve pausa, volviendo a la primera página. */
  useEffect(() => {
    if (!open || term.trim() === query) return
    const timer = setTimeout(() => applySearch(), SEARCH_DELAY)
    return () => clearTimeout(timer)
  })

  /** Evita cambiar una selección de otra sesión antes de recibir el evento de foco. */
  function choose(option: LookupOption | null) {
    if (revision !== undefined && !isSessionCurrent?.(revision)) return
    onChange(option)
    setOpen(false)
  }

  /** Repite solo la lectura actual, conservando consulta, página y selección. */
  function retry() {
    if (disabled || (revision !== undefined && !isSessionCurrent?.(revision))) return
    setRefreshKey(key => key + 1)
  }

  /** Aplica expresamente el nombre escrito y vuelve a la primera página. */
  function applySearch() {
    if (session && (disabled || !session.isSessionCurrent(session.revision))) return
    setPage(1)
    setQuery(term.trim())
    setRefreshKey((key) => key + 1)
  }

  /** Cambia la página de resultados sin cambiar la selección del formulario. */
  function changePage(nextPage: number) {
    if (session && (disabled || !session.isSessionCurrent(session.revision))) return
    setPage(nextPage)
    scrollRef.current?.querySelector<HTMLElement>('[data-slot=scroll-area-viewport]')?.scrollTo({ top: 0 })
  }

  /** Navegación con flechas entre el buscador y las opciones. */
  function moveFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const options = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-option]') ?? [])]
    if (!options.length) return
    event.preventDefault()
    const index = options.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'ArrowDown') options[Math.min(index + 1, options.length - 1)]?.focus()
    else if (index <= 0) searchRef.current?.focus()
    else options[index - 1]?.focus()
  }

  const invalid = Boolean(validationError)
  const items = result?.items ?? []
  const totalPages = result?.totalPages ?? 0

  return (
    <div className="grid min-w-0 gap-2" data-invalid={invalid || undefined}>
      <Label htmlFor={id} className={invalid ? 'text-destructive' : undefined}>
        {label}{required ? <span className="text-destructive" aria-hidden="true">*</span> : <span className="text-xs font-normal text-muted-foreground">(opcional)</span>}
      </Label>
      <Popover open={open} onOpenChange={(next) => { if (!disabled) setOpen(next) }}>
        <PopoverTrigger
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            'flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm transition-colors outline-none',
            'hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-popup-open:border-ring',
            'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30',
          )}
        >
          {value ? (
            <>
              <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-1 ring-foreground/10">{initials(value.label)}</span>
              <span className="min-w-0 flex-1 truncate font-medium" title={value.label}>{value.label}</span>
            </>
          ) : (
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{placeholder ?? `Seleccione ${label.toLowerCase()}`}</span>
          )}
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) min-w-72 max-w-[calc(100vw-2rem)] gap-0 p-0" initialFocus={searchRef}>
          <div className="flex items-center gap-2 border-b px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Input
              ref={searchRef}
              aria-label={`Buscar ${label.toLowerCase()}`}
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applySearch() } else moveFocus(event) }}
              disabled={disabled}
              placeholder="Escriba para buscar..."
              className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
            {term && <Button type="button" variant="ghost" size="icon-xs" aria-label="Limpiar búsqueda" onClick={() => { setTerm(''); searchRef.current?.focus() }}><XIcon /></Button>}
          </div>

          <div className="relative" aria-busy={loading}>
            {loading && items.length === 0 && (
              <div role="status" className="space-y-1 p-1.5">
                {Array.from({ length: 5 }, (_, index) => <div key={index} className="flex items-center gap-2 px-2 py-1.5"><Skeleton className="size-6 rounded-full" /><Skeleton className="h-4 flex-1" /></div>)}
                <span className="sr-only">Buscando...</span>
              </div>
            )}
            {session && error && !loading && (
              <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                <AlertCircleIcon className="size-5 text-destructive" aria-hidden="true" />
                <p role="alert" className="text-sm text-destructive">{error}</p>
                <Button type="button" size="sm" variant="outline" disabled={disabled || loading} onClick={retry}><RotateCcwIcon data-icon="inline-start" />Reintentar {label.toLowerCase()}</Button>
              </div>
            )}
            {!error && result && items.length === 0 && !loading && (
              <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
                <SearchXIcon className="size-5 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{query ? <>Sin resultados para «{query}»</> : 'Sin resultados'}</p>
              </div>
            )}
            {!error && items.length > 0 && (
              <ScrollArea ref={scrollRef} className="[&>[data-slot=scroll-area-viewport]]:max-h-64">
              <ul ref={listRef} role="listbox" aria-label={label} className={cn('p-1.5 transition-opacity', loading && 'opacity-50')}>
                {items.map((item) => {
                  const selected = value?.id === item.id
                  return (
                    <li key={item.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        data-option
                        disabled={disabled}
                        onKeyDown={moveFocus}
                        onClick={() => choose(item)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted disabled:opacity-50',
                          selected && 'bg-muted/60 font-medium',
                        )}
                      >
                        <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-[10px] font-semibold text-muted-foreground ring-1 ring-foreground/10">{initials(item.label)}</span>
                        <span className="min-w-0 flex-1 break-words">{item.label}</span>
                        {selected && <CheckIcon className="size-4 shrink-0" aria-hidden="true" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
              </ScrollArea>
            )}
          </div>

          {(totalPages > 1 || value) && (
            <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-2 py-1.5">
              {value
                ? <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => choose(null)} className="text-muted-foreground"><XIcon data-icon="inline-start" />Quitar selección</Button>
                : <span />}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Página anterior" disabled={disabled || loading || page <= 1} onClick={() => changePage(page - 1)}><ChevronLeftIcon /></Button>
                  <span className="text-xs text-muted-foreground tabular-nums">{page} / {totalPages}</span>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Página siguiente" disabled={disabled || loading || page >= totalPages} onClick={() => changePage(page + 1)}><ChevronRightIcon /></Button>
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
      {validationError && <p role="alert" className="text-sm text-destructive">{validationError}</p>}
    </div>
  )
}
