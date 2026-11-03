'use client'

import { useEffect, useState } from 'react'
// import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CalendarClockIcon, GlobeIcon, LandmarkIcon, MapPinIcon, PhoneIcon, PrinterIcon, TagIcon, TruckIcon, UsersIcon } from 'lucide-react'
import { AddressBlock, BackLink, ContactBlock, DetailError, DetailHero, DetailItem, DetailSkeleton, MapCard, SectionCard, osmEmbedUrl } from '@/components/detail-kit'
import { initials } from '@/components/list-kit'
import { Badge } from '@/components/ui/badge'
// import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSession } from '@/components/auth-session'
import { getSupplierAddressByID, getSupplierByID, getSupplierContactsByID } from '@/app/api/suppliers'
import { parseEntityId } from '@/lib/helpers/entityValidation'
import type { SupplierAddress, SupplierContact, SupplierDetail, SupplierRouteParams } from '@/lib/types/suppliers'

export default function SupplierDetailPage() {
  const { supplierID } = useParams<SupplierRouteParams>()
  return <SupplierDetailContent key={supplierID} supplierID={supplierID} />
}

/** Vincula las tres lecturas del detalle al ID y sesión que las iniciaron. */
function SupplierDetailContent({ supplierID }: { supplierID: string }) {
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null)
  const [contacts, setContacts] = useState<SupplierContact | null>(null)
  const [address, setAddress] = useState<SupplierAddress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision
    /** Procesa todos los 401 aunque otra lectura paralela haya fallado antes. */
    function failed(reason: unknown, resource: string): never {
      const status = reason instanceof Error ? reason.cause : null
      if (status === 401) invalidateSession(requestRevision)
      else if (!cancelled && isSessionCurrent(requestRevision)) {
        const message = status === 403 ? 'Sin permisos.' : reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503) ? 'No fue posible cargar el recurso. Intente nuevamente.' : reason instanceof Error ? reason.message : 'No disponible.'
        setError(`${resource}: ${message}`)
      }
      throw reason
    }

    async function loadSupplier() {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setIsLoading(true)
      setError(null)
      setSupplier(null)
      setContacts(null)
      setAddress(null)

      const id = parseEntityId(supplierID)
      if (id === null) {
        setError('Proveedor no encontrado')
        setIsLoading(false)
        return
      }

      try {
        const [details, supplierContacts, supplierAddress] = await Promise.all([
          getSupplierByID(id).catch(reason => failed(reason, 'Proveedor')),
          getSupplierContactsByID(id).catch(reason => failed(reason, 'Contactos')),
          getSupplierAddressByID(id).catch(reason => failed(reason, 'Direcciones')),
        ])

        if (cancelled || !isSessionCurrent(requestRevision)) return
        if (!details[0] || details[0].SupplierID !== id) {
          setError('Proveedor no encontrado')
          return
        }

        setSupplier(details[0])
        setContacts(supplierContacts[0] ?? null)
        setAddress(supplierAddress[0] ?? null)
      } catch {
        if (!cancelled && isSessionCurrent(requestRevision)) setError(previous => previous ?? 'No fue posible obtener el proveedor. Intente nuevamente.')
      } finally {
        if (!cancelled && isSessionCurrent(requestRevision)) setIsLoading(false)
      }
    }

    queueMicrotask(() => { void loadSupplier() })
    return () => { cancelled = true }
  }, [supplierID, refreshKey, revision, isSessionCurrent, invalidateSession])

  const mapUrl = osmEmbedUrl(address?.Latitud, address?.Longitud)
  const website = supplier?.SitioWeb && /^https?:\/\//i.test(supplier.SitioWeb) ? supplier.SitioWeb : null

  return (
    <main className="flex min-w-0 flex-1 bg-muted/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <BackLink href="/suppliers">Volver a proveedores</BackLink>

        {isLoading && <DetailSkeleton label="Cargando proveedor..." />}
        {!isLoading && error && <DetailError message={error} onRetry={parseEntityId(supplierID) !== null ? () => setRefreshKey(key => key + 1) : undefined} />}

        {!isLoading && !error && supplier && (
          <>
            <DetailHero
              badge={initials(supplier.NombreProveedor)}
              eyebrow={`Proveedor #${supplier.SupplierID}${supplier.CodigoProveedor ? ` · ${supplier.CodigoProveedor}` : ''}`}
              title={supplier.NombreProveedor}
              tags={<>
                <Badge variant="secondary"><TagIcon aria-hidden="true" />{supplier.NombreCategoriaProveedor}</Badge>
                <Badge variant="outline"><TruckIcon aria-hidden="true" />{supplier.NombreMetodoEntrega ?? 'Sin método de entrega'}</Badge>
              </>}
              // action={<Button nativeButton={false} render={<Link href={`/suppliers/${supplier.SupplierID}/edit`} />} className="shrink-0"><PencilIcon data-icon="inline-start" />Editar proveedor</Button>}
              stats={[
                { icon: CalendarClockIcon, label: 'Días para pagar', value: String(supplier.DiasGraciaPago) },
                { icon: PhoneIcon, label: 'Teléfono', value: supplier.Telefono },
                { icon: PrinterIcon, label: 'Fax', value: supplier.Fax },
                { icon: GlobeIcon, label: 'Sitio web', value: website, href: website ?? undefined, title: website ?? undefined },
              ]}
            />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-6 lg:col-span-2">
                <SectionCard icon={MapPinIcon} title="Direcciones" description="Entrega y correspondencia del proveedor.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <AddressBlock title="Dirección de entrega" lines={[address?.DireccionEntrega1, address?.DireccionEntrega2, [address?.CiudadEntrega, address?.ProvinciaEntrega, address?.PaisEntrega].filter(Boolean).join(', ')]} postalCode={address?.CodigoPostalEntrega} />
                    <AddressBlock title="Dirección postal" lines={[address?.DireccionPostal1, address?.DireccionPostal2, [address?.CiudadPostal, address?.ProvinciaPostal, address?.PaisPostal].filter(Boolean).join(', ')]} postalCode={address?.CodigoPostalPostal} />
                  </div>
                </SectionCard>

                <SectionCard icon={LandmarkIcon} title="Datos bancarios" description="Información para pagos al proveedor.">
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <DetailItem label="Nombre de la cuenta" value={supplier.NombreBanco} />
                    <DetailItem label="Sucursal" value={supplier.SucursalBanco} />
                    <DetailItem label="Número de cuenta" value={supplier.NumeroCuentaBancaria} mono />
                    <DetailItem label="Código SWIFT" value={supplier.CodigoSwift} mono />
                  </dl>
                </SectionCard>

                <MapCard url={mapUrl} title={`Ubicación de entrega de ${supplier.NombreProveedor}`} emptyMessage="Este proveedor no tiene coordenadas disponibles." />
              </div>

              <div className="min-w-0 space-y-6">
                <SectionCard icon={UsersIcon} title="Contactos">
                  <div className="space-y-4">
                    <ContactBlock role="Principal" name={contacts?.NombreContactoPrincipal} phone={contacts?.TelefonoPrincipal} fax={contacts?.FaxPrincipal} email={contacts?.CorreoPrincipal} />
                    <Separator />
                    <ContactBlock role="Alternativo" name={contacts?.NombreContactoAlternativo} phone={contacts?.TelefonoAlternativo} fax={contacts?.FaxAlternativo} email={contacts?.CorreoAlternativo} />
                  </div>
                </SectionCard>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
