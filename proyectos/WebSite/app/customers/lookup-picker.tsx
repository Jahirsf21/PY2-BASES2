'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ui/toast'

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
}

export function LookupPicker({ id, label, value, onChange, search, disabled, required }: LookupPickerProps) {
  const [term, setTerm] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    search(query, page).then((data) => {
      if (!cancelled) setResult(data)
    }).catch((reason) => {
      if (cancelled) return
      const message = reason instanceof Error ? reason.message : 'No fue posible buscar'
      setError(message)
      toast.add({ type: 'error', title: `No se pudo buscar: ${label}`, description: message, priority: 'high', timeout: 8000 })
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [query, page, search, refreshKey, label])

  function applySearch() {
    setLoading(true)
    setError(null)
    setPage(1)
    setQuery(term.trim())
    setRefreshKey((key) => key + 1)
  }

  function changePage(nextPage: number) {
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
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onChange(null)}>Quitar</Button>
        </div>
      )}
      <div className="flex gap-2">
        <Input id={id} value={term} onChange={(event) => setTerm(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applySearch() } }} disabled={disabled} placeholder="Buscar por nombre" />
        <Button type="button" variant="outline" disabled={disabled} onClick={applySearch}>Buscar</Button>
      </div>
      {loading && <p className="text-sm text-muted-foreground">Buscando...</p>}
      {!loading && !error && result && (
        <>
          <ScrollArea className="h-40 rounded-md border">
            <ul className="divide-y text-sm">
              {result.items.map((item) => (
                <li key={item.id}>
                  <button type="button" disabled={disabled} onClick={() => onChange(item)} className="w-full px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted disabled:opacity-50">
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
