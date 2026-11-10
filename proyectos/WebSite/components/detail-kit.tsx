'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { AlertCircleIcon, ArrowLeftIcon, ExternalLinkIcon, MailIcon, MapIcon, PhoneIcon, PrinterIcon, RotateCcwIcon, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { initials } from '@/components/list-kit'

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"><ArrowLeftIcon className="size-4" aria-hidden="true" />{children}</Link>
}

export function DetailSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="space-y-6">
      <div className="flex items-center gap-4 rounded-xl bg-card p-6 ring-1 ring-foreground/10"><Skeleton className="size-14 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-64" /><Skeleton className="h-5 w-40" /></div></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">{[0, 1].map(index => <Skeleton key={index} className="h-48 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function DetailError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-card px-4 py-16 text-center ring-1 ring-foreground/10">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertCircleIcon className="size-6" aria-hidden="true" /></span>
      <p role="alert" className="max-w-md text-sm text-destructive">{message}</p>
      {onRetry && <Button type="button" variant="outline" size="sm" onClick={onRetry}><RotateCcwIcon data-icon="inline-start" />Reintentar detalle</Button>}
    </div>
  )
}

export interface DetailLoadState {
  loading: boolean
  error: string | null
}

/** Muestra la carga o el error de una sección sin ocultar el resto del detalle. */
export function DetailSectionFeedback({ state, label, onRetry, children }: { state: DetailLoadState; label: string; onRetry?: () => void; children?: ReactNode }) {
  if (state.loading) {
    return <div role="status" className="space-y-2"><Skeleton className="h-5 w-40" /><p className="text-sm text-muted-foreground">{label}</p></div>
  }
  if (state.error) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
        {onRetry && <Button type="button" variant="outline" size="sm" onClick={onRetry}><RotateCcwIcon data-icon="inline-start" />Reintentar datos privados</Button>}
      </div>
    )
  }
  return <>{children}</>
}

export interface StatItem { icon: LucideIcon; label: string; value: ReactNode; href?: string; title?: string }


export function DetailHero({ badge, eyebrow, title, tags, action, stats }: { badge: ReactNode; eyebrow: string; title: string; tags?: ReactNode; action?: ReactNode; stats?: StatItem[] }) {
  return (
    <Card className="gap-0 py-0 shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-foreground text-lg font-semibold text-background shadow-sm" aria-hidden="true">{badge}</span>
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
            <h1 className="break-words text-2xl font-semibold tracking-tight">{title}</h1>
            {tags && <div className="flex flex-wrap gap-1.5">{tags}</div>}
          </div>
        </div>
        {action}
      </div>
      {stats && stats.length > 0 && (
        <>
          <Separator />
          <dl className={cn('grid grid-cols-2 divide-foreground/10 bg-muted/30 sm:divide-x', stats.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4')}>
            {stats.map(stat => <Stat key={stat.label} {...stat} />)}
          </dl>
        </>
      )}
    </Card>
  )
}

function Stat({ icon: Icon, label, value, href, title }: StatItem) {
  const empty = value === null || value === undefined || value === ''
  return (
    <div className="min-w-0 px-5 py-4 sm:px-6">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" aria-hidden="true" />{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium tabular-nums" title={title}>
        {empty
          ? <span className="font-normal text-muted-foreground italic">No disponible</span>
          : href
            ? <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 underline underline-offset-2"><span className="truncate">{value}</span><ExternalLinkIcon className="size-3 shrink-0" aria-hidden="true" /></a>
            : value}
      </dd>
    </div>
  )
}

export function SectionCard({ icon: Icon, title, description, action, children, contentClassName }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode; children: ReactNode; contentClassName?: string }) {
  const id = `section-${title.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <Card className="gap-0 py-0 shadow-sm" aria-labelledby={id} role="region">
      <CardHeader className="border-b bg-muted/40 py-3">
        <CardTitle id={id} className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-muted-foreground" aria-hidden="true" />{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
        {action && <CardAction className="self-center">{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn('py-5', contentClassName)}>{children}</CardContent>
    </Card>
  )
}

export function DetailItem({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  const empty = value === null || value === undefined || value === ''
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={empty ? 'text-sm text-muted-foreground italic' : cn('break-words text-sm font-medium', mono && 'font-mono')}>{empty ? 'No disponible' : value}</dd>
    </div>
  )
}

export function AddressBlock({ title, lines, postalCode }: { title: string; lines: (string | null | undefined)[]; postalCode: string | null | undefined }) {
  const visible = lines.filter(Boolean)
  return (
    <div className="min-w-0 rounded-lg border bg-muted/30 p-4">
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      <address className="space-y-0.5 break-words text-sm not-italic">
        {visible.length ? visible.map((line, index) => <p key={index} className={index === 0 ? 'font-medium' : undefined}>{line}</p>) : <p className="text-muted-foreground italic">No disponible</p>}
        <p className="pt-1 text-muted-foreground">Código postal: <span className="font-mono text-foreground">{postalCode ?? 'No disponible'}</span></p>
      </address>
    </div>
  )
}

export function ContactBlock({ role, name, phone, fax, email }: { role: string; name: string | null | undefined; phone: string | null | undefined; fax: string | null | undefined; email: string | null | undefined }) {
  const missing = <span className="text-muted-foreground italic">No disponible</span>
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-1 ring-foreground/10">{name ? initials(name) : '?'}</span>
        <div className="min-w-0">
          <p className="break-words text-sm font-medium">{name ?? 'No disponible'}</p>
          <Badge variant="outline" className="mt-0.5">Contacto {role.toLowerCase()}</Badge>
        </div>
      </div>
      <dl className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2"><dt><PhoneIcon className="size-3.5 text-muted-foreground" aria-label="Teléfono" /></dt><dd className="min-w-0 break-words">{phone ?? missing}</dd></div>
        <div className="flex items-center gap-2"><dt><PrinterIcon className="size-3.5 text-muted-foreground" aria-label="Fax" /></dt><dd className="min-w-0 break-words">{fax ?? missing}</dd></div>
        <div className="flex items-center gap-2"><dt><MailIcon className="size-3.5 text-muted-foreground" aria-label="Correo" /></dt><dd className="min-w-0 break-all">{email ? <a href={`mailto:${email}`} className="underline-offset-2 hover:underline">{email}</a> : missing}</dd></div>
      </dl>
    </div>
  )
}

export function MapCard({ url, title, emptyMessage, state, onRetry }: { url: string | null; title: string; emptyMessage: string; state?: DetailLoadState; onRetry?: () => void }) {
  return (
    <SectionCard icon={MapIcon} title="Ubicación de entrega">
      <DetailSectionFeedback state={state ?? { loading: false, error: null }} label="Consultando ubicación en Corporativo..." onRetry={onRetry}>
        {url ? (
          <iframe title={title} src={url} loading="lazy" className="h-72 w-full rounded-lg border sm:h-96" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center">
            <MapIcon className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        )}
      </DetailSectionFeedback>
    </SectionCard>
  )
}

/** URL del mapa embebido de OpenStreetMap, sin enviar el token ni datos de sesión. */
export function osmEmbedUrl(latitude: number | null | undefined, longitude: number | null | undefined) {
  return latitude != null && longitude != null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.02}%2C${latitude - 0.01}%2C${longitude + 0.02}%2C${latitude + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : null
}
