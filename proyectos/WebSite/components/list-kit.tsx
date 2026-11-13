'use client'

import type { ReactNode, SubmitEvent } from 'react'
import Link from 'next/link'
import { AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, FilterIcon, Loader2Icon, MoreHorizontalIcon, PencilIcon, PlusIcon, RotateCcwIcon, SearchIcon, SearchXIcon, Trash2Icon, XIcon, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { SCROLL_LIST_CLASS } from '@/components/form-kit'

/** Estilo de los encabezados de tabla. */
export const HEAD_CLASS = 'text-xs font-semibold tracking-wide text-muted-foreground uppercase'

/** Obtiene hasta dos iniciales del texto para el avatar. */
export function initials(text: string) {
  return text.replace(/[^\p{L}\p{N}\s,]/gu, '').split(/[\s,]+/).filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase()).join('') || '?'
}

/** Avatar con las iniciales del nombre. */
export function EntityAvatar({ name, className }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={cn('flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-1 ring-foreground/10', className)}>{initials(name)}</span>
}

/** Encabezado del módulo: icono, título, contador y acción principal. */
export function PageHeader({ icon: Icon, title, subtitle, action }: { icon: LucideIcon; title: string; subtitle: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-sm"><Icon className="size-5" aria-hidden="true" /></span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {action}
    </header>
  )
}

/**
 * Acción de alta: botón en el encabezado en escritorio y botón flotante en móvil/tablet,
 * por encima de la barra de navegación inferior.
 */
export function NewButton({ href, label }: { href: string; label: string }) {
  return (
    <>
      <Button nativeButton={false} render={<Link href={href} />} size="lg" className="hidden lg:inline-flex"><PlusIcon data-icon="inline-start" />{label}</Button>
      <Link
        href={href}
        aria-label={label}
        title={label}
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-foreground/10 transition-transform outline-none hover:scale-105 focus-visible:ring-4 focus-visible:ring-ring/50 active:scale-95 sm:right-6 lg:hidden"
      >
        <PlusIcon className="size-6" aria-hidden="true" />
      </Link>
    </>
  )
}

/** Errores de catálogos auxiliares con reintento manual. */
export function ReadErrorsBanner({ messages, onRetry, disabled }: { messages: string[]; onRetry: () => void; disabled: boolean }) {
  if (messages.length === 0) return null
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        {messages.map(message => <p key={message} role="alert" className="flex items-start gap-2 text-sm text-destructive"><AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{message}</p>)}
      </div>
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onRetry}><RotateCcwIcon data-icon="inline-start" />Reintentar lecturas</Button>
    </div>
  )
}

/** Tarjeta de filtros con contador de filtros aplicados. */
export function FilterCard({ activeFilters, onSubmit, onReset, disabled, className, children }: {
  activeFilters: number; onSubmit: (event: SubmitEvent<HTMLFormElement>) => void; onReset: () => void; disabled?: boolean; className: string; children: ReactNode
}) {
  return (
    <Card className="gap-0 py-0 shadow-sm">
      <CardHeader className="border-b bg-muted/40 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold"><FilterIcon className="size-4 text-muted-foreground" aria-hidden="true" />Filtros{activeFilters > 0 && <Badge variant="secondary">{activeFilters} activo{activeFilters === 1 ? '' : 's'}</Badge>}</CardTitle>
      </CardHeader>
      <CardContent className="py-4">
        <form className={className} onSubmit={onSubmit}>
          {children}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={disabled}><SearchIcon data-icon="inline-start" />Buscar</Button>
            <Button type="button" variant="outline" disabled={disabled} onClick={onReset}><RotateCcwIcon data-icon="inline-start" />Limpiar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/** Campo de búsqueda con icono. */
export function SearchField({ id, label, placeholder, value, onChange, disabled, ...props }: { id: string; label: string; placeholder: string; value: string; onChange: (value: string) => void; disabled?: boolean } & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'>) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input id={id} placeholder={placeholder} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="pl-8" {...props} />
      </div>
    </div>
  )
}

/** Select de filtro con opción "todos" y ScrollArea. */
export function FilterSelect({ id, label, allLabel, options, value, onChange, disabled }: {
  id: string; label: string; allLabel: string; options: { value: number; label: string }[]; value: number | null; onChange: (value: number | null) => void; disabled?: boolean
}) {
  const items = [{ value: 'all', label: allLabel }, ...options.map(option => ({ value: String(option.value), label: option.label }))]
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select items={items} value={value === null ? 'all' : String(value)} onValueChange={(next) => onChange(next === null || next === 'all' ? null : Number(next))} disabled={disabled}>
        <SelectTrigger id={id} className="w-full min-w-0"><SelectValue className="min-w-0 truncate" /></SelectTrigger>
        <SelectContent className="overflow-hidden p-0" alignItemWithTrigger={false}>
          <ScrollArea className={SCROLL_LIST_CLASS}><div className="p-1">{items.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</div></ScrollArea>
        </SelectContent>
      </Select>
    </div>
  )
}

/** Tarjeta del listado con título y estado de página. */
export function ListCard({ title, loadingMore, pageNumber, totalPages, children }: { title: string; loadingMore: boolean; pageNumber: number; totalPages: number; children: ReactNode }) {
  return (
    <Card className="gap-0 py-0 shadow-sm">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CardAction className="self-center text-xs text-muted-foreground">
          {loadingMore ? <span className="inline-flex items-center gap-1.5"><Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />Actualizando...</span> : `Página ${totalPages === 0 ? 0 : pageNumber} de ${totalPages}`}
        </CardAction>
      </CardHeader>
      {children}
    </Card>
  )
}

/** Barra de selección: solo muestra las acciones cuando hay una fila seleccionada. */
export function SelectionBar({ selectedName, hint, noun, onClear, confirming, onConfirmingChange, deleting, disabled, onDelete }: {
  selectedName: string | null; hint: string; noun: string; onClear: () => void; confirming: boolean; onConfirmingChange: (open: boolean) => void; deleting: boolean; disabled: boolean; onDelete: () => void
}) {
  return (
    <div className={selectedName ? 'flex flex-col gap-3 border-b bg-muted/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between' : 'border-b px-4 py-2'}>
      <p className="min-w-0 break-words text-sm text-muted-foreground" aria-live="polite">
        {selectedName ? <>Seleccionado: <span className="font-medium text-foreground">{selectedName}</span></> : hint}
      </p>
      {selectedName && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={disabled || deleting} onClick={onClear}><XIcon data-icon="inline-start" />Quitar selección</Button>
          <AlertDialog open={confirming} onOpenChange={(open) => { if (!deleting) onConfirmingChange(open) }}>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm" />} disabled={disabled || deleting}>
              <Trash2Icon data-icon="inline-start" />
              Eliminar {noun}
            </AlertDialogTrigger>
            <AlertDialogContent aria-busy={deleting}>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar a {selectedName}?</AlertDialogTitle>
                <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction type="button" variant="destructive" disabled={deleting} onClick={onDelete}>
                  {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}

/** Filas de esqueleto mientras se carga la primera página. */
export function TableSkeleton({ label, avatar = true, rows = 6 }: { label: string; avatar?: boolean; rows?: number }) {
  return (
    <div role="status" className="divide-y">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3">
          {avatar && <Skeleton className="size-4 rounded" />}
          {avatar && <Skeleton className="size-9 rounded-full" />}
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-16" /></div>
          <Skeleton className="hidden h-5 w-28 rounded-full md:block" />
          <Skeleton className="hidden h-5 w-24 rounded-full md:block" />
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}

/** Estado de error de la lista con un botón para reintentar. */
export function ErrorState({ message, onRetry, disabled }: { message: string; onRetry: () => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertCircleIcon className="size-6" aria-hidden="true" /></span>
      <p className="max-w-md text-sm text-destructive" role="alert">{message}</p>
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onRetry}><RotateCcwIcon data-icon="inline-start" />Reintentar lecturas</Button>
    </div>
  )
}

/** Estado sin resultados con opción de limpiar los filtros. */
export function EmptyState({ message, onReset }: { message: string; onReset?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><SearchXIcon className="size-6" aria-hidden="true" /></span>
      <div className="space-y-1">
        <p className="font-medium">Sin resultados</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onReset && <Button type="button" variant="outline" size="sm" onClick={onReset}><RotateCcwIcon data-icon="inline-start" />Limpiar filtros</Button>}
    </div>
  )
}

/**
 * Acciones por fila: detalle directo y menú con edición.
 * Sin editHref (módulos de solo consulta), queda únicamente el acceso al detalle.
 */
export function RowMenu({ detailHref, editHref, name }: { detailHref: string; editHref?: string; name: string }) {
  if (!editHref) {
    return (
      <Button nativeButton={false} render={<Link href={detailHref} />} variant="ghost" size="icon-sm" aria-label={`Ver detalle de ${name}`}>
        <EyeIcon />
      </Button>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Más acciones para ${name}`} />}>
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem render={<Link href={detailHref} />}><EyeIcon />Ver detalle</DropdownMenuItem>
        <DropdownMenuItem render={<Link href={editHref} />}><PencilIcon />Editar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Acciones de una fila: ver detalle y, si aplica, editar. */
export function RowActions({ detailHref, editHref, name }: { detailHref: string; editHref?: string; name: string }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button nativeButton={false} render={<Link href={detailHref} />} variant="outline" size="sm"><EyeIcon data-icon="inline-start" />Ver detalle</Button>
      {editHref && <RowMenu detailHref={detailHref} editHref={editHref} name={name} />}
    </div>
  )
}

/** Pie de paginación: rango mostrado, anterior/siguiente e ir a página. */
export function ListPagination({ inputId, noun, pageNumber, totalPages, totalCount, pageSize, shown, disabled, onChange, onSubmit }: {
  inputId: string; noun: string; pageNumber: number; totalPages: number; totalCount: number; pageSize: number; shown: number; disabled: boolean
  onChange: (page: number) => void; onSubmit: (event: SubmitEvent<HTMLFormElement>) => void
}) {
  const first = totalCount === 0 || shown === 0 ? 0 : (pageNumber - 1) * pageSize + 1
  const last = (pageNumber - 1) * pageSize + shown
  return (
    <div className="flex flex-col items-center gap-3 border-t bg-muted/30 px-4 py-3 sm:flex-row sm:justify-between">
      <p className="text-center text-sm text-muted-foreground sm:text-left">
        {first === 0 ? `Sin ${noun} para mostrar` : <>Mostrando <span className="font-medium text-foreground tabular-nums">{first}–{last}</span> de <span className="font-medium text-foreground tabular-nums">{totalCount}</span> {noun}</>}
      </p>
      <div className="flex flex-col items-center gap-2 sm:flex-row">
        <div className="flex justify-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={pageNumber === 1 || totalPages === 0 || disabled} onClick={() => onChange(pageNumber - 1)}><ChevronLeftIcon data-icon="inline-start" />Anterior</Button>
          <Button type="button" variant="outline" size="sm" disabled={pageNumber >= totalPages || disabled} onClick={() => onChange(pageNumber + 1)}>Siguiente<ChevronRightIcon data-icon="inline-end" /></Button>
        </div>
        <form className="flex items-center justify-center gap-2" onSubmit={onSubmit}>
          <Label htmlFor={inputId} className="text-sm font-normal text-muted-foreground">Ir a</Label>
          <Input
            key={pageNumber}
            id={inputId}
            name="pageNumber"
            type="number"
            min={1}
            max={totalPages}
            step={1}
            required
            defaultValue={pageNumber}
            disabled={disabled || totalPages === 0}
            onKeyDown={(event) => { if (event.key === '-') event.preventDefault() }}
            onChange={(event) => { if (event.currentTarget.value !== '' && Number(event.currentTarget.value) < 1) event.currentTarget.value = '1' }}
            className="h-7 w-16 text-center"
          />
          <Button type="submit" variant="outline" size="sm" disabled={disabled || totalPages === 0}>Ir</Button>
        </form>
      </div>
    </div>
  )
}
