'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
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
}

/** Mantiene el modo anterior de los consumidores que todavía no integran su sesión. */
export function LookupPicker({ sessionAware = false, ...props }: LookupPickerProps) {
  return sessionAware ? <SessionLookupPicker {...props} /> : <LookupPickerContent {...props} />
}

/** Vincula únicamente los selectores que lo solicitan al contexto de sesión vigente. */
function SessionLookupPicker(props: LookupPickerProps) {
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  return <LookupPickerContent {...props} session={{ revision, isSessionCurrent, invalidateSession }} />
}

/** Presenta la búsqueda paginada y, en modo de sesión, errores y reintento manual. */
function LookupPickerContent({ id, label, value, onChange, search, disabled, required, session }: LookupPickerProps & {
  session?: Pick<ReturnType<typeof useSession>, 'revision' | 'isSessionCurrent' | 'invalidateSession'>
}) {
  const { revision, isSessionCurrent, invalidateSession } = session ?? {}
  const [term, setTerm] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision
    /** Comprueba también cambios del almacenamiento que todavía no recibieron foco. */
    const current = () => requestRevision === undefined || Boolean(isSessionCurrent?.(requestRevision))
    async function load() {
      if (cancelled || !current()) return
      if (requestRevision !== undefined) {
        setLoading(true)
        setError(null)
      }
      try {
        const data = await search(query, page)
        if (!cancelled && current()) {
          setResult(data)
          if (requestRevision !== undefined) setError(null)
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
  }, [query, page, search, refreshKey, label, revision, isSessionCurrent, invalidateSession])

  /** Evita cambiar una selección de otra sesión antes de recibir el evento de foco. */
  function choose(option: LookupOption | null) {
    if (revision !== undefined && !isSessionCurrent?.(revision)) return
    onChange(option)
  }

  /** Repite solo la lectura actual, conservando consulta, página y selección. */
  function retry() {
    if (disabled || (revision !== undefined && !isSessionCurrent?.(revision))) return
    setLoading(true)
    setError(null)
    setRefreshKey(key => key + 1)
  }

  /** Aplica expresamente el nombre escrito y vuelve a la primera página. */
  function applySearch() {
    if (session && (disabled || !session.isSessionCurrent(session.revision))) return
    setLoading(true)
    setError(null)
    setPage(1)
    setQuery(term.trim())
    setRefreshKey((key) => key + 1)
  }

  /** Cambia la página de resultados sin cambiar la selección del formulario. */
  function changePage(nextPage: number) {
    if (session && (disabled || !session.isSessionCurrent(session.revision))) return
    setLoading(true)
    setError(null)
    setPage(nextPage)
  }

  return (
    <div className="min-w-0 space-y-2 rounded-lg border p-3">
      <Label htmlFor={id}>{label}{required ? ' *' : ''}</Label>
      {value && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm">
          <span className="break-words">{value.label}</span>
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => choose(null)}>Quitar</Button>
        </div>
      )}
      <div className="flex gap-2">
        <Input id={id} value={term} onChange={(event) => setTerm(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applySearch() } }} disabled={disabled} placeholder="Buscar por nombre" />
        <Button type="button" variant="outline" disabled={disabled} onClick={applySearch}>Buscar</Button>
      </div>
      {loading && <p className="text-sm text-muted-foreground">Buscando...</p>}
      {session && error && (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-destructive">{error}</p>
          <Button type="button" size="sm" variant="outline" disabled={disabled || loading} onClick={retry}>Reintentar {label.toLowerCase()}</Button>
        </div>
      )}
      {!loading && !error && result && (
        <>
          <ScrollArea className="h-40 rounded-md border">
            <ul className="divide-y text-sm">
              {result.items.map((item) => (
                <li key={item.id}>
                  <button type="button" disabled={disabled} onClick={() => choose(item)} className="w-full px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted disabled:opacity-50">
                    {item.label}
                  </button>
                </li>
              ))}
              {result.items.length === 0 && <li className="px-3 py-2 text-muted-foreground">Sin resultados</li>}
            </ul>
          </ScrollArea>
          <div className="flex items-center justify-between gap-2 text-sm">
            <Button type="button" size="sm" variant="outline" disabled={disabled || page <= 1} onClick={() => changePage(page - 1)}>Anterior</Button>
            <span>Página {page} de {result.totalPages}</span>
            <Button type="button" size="sm" variant="outline" disabled={disabled || page >= result.totalPages} onClick={() => changePage(page + 1)}>Siguiente</Button>
          </div>
        </>
      )}
    </div>
  )
}
