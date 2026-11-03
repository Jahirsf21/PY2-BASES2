'use client'

import { useEffect, useState } from 'react'
// import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CalendarClockIcon, GlobeIcon, MapPinIcon, PhoneIcon, ReceiptTextIcon, TagIcon, TruckIcon, UsersIcon, UsersRoundIcon } from 'lucide-react'
import { AddressBlock, BackLink, ContactBlock, DetailError, DetailHero, DetailSkeleton, MapCard, SectionCard, osmEmbedUrl } from '@/components/detail-kit'
import { initials } from '@/components/list-kit'
import { Badge } from '@/components/ui/badge'
// import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getCustomerAddressByID, getCustomerByID, getCustomerContactsByID } from '@/app/api/customers'
import { useSession } from '@/components/auth-session'
import { parseEntityId } from '@/lib/helpers/entityValidation'
import type { CustomerAddress, CustomerContact, CustomerDetail, CustomerRouteParams } from '@/lib/types/customers'

/** Reinicia el detalle inmediatamente al cambiar el identificador de la ruta. */
export default function CustomerDetailPage() {
  const { customerID } = useParams<CustomerRouteParams>()
  return <CustomerDetailContent key={customerID} customerID={customerID} />
}

/** Carga el detalle completo dentro de la revisión de sesión que lo solicitó. */
function CustomerDetailContent({ customerID }: { customerID: string }) {
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [contacts, setContacts] = useState<CustomerContact | null>(null)
  const [address, setAddress] = useState<CustomerAddress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision

    /** Trata cada 401 antes de que Promise.all descarte otro resultado pendiente. */
    function readFailed(reason: unknown, resource: string): never {
      const status = reason instanceof Error ? reason.cause : null
      if (status === 401) invalidateSession(requestRevision)
      else if (!cancelled && isSessionCurrent(requestRevision)) {
        let message = reason instanceof Error ? reason.message : 'No fue posible cargar el recurso.'
        if (status === 403) message = 'Sin permisos para consultar este recurso.'
        else if (reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503)) message = 'No fue posible cargar el recurso. Intente nuevamente.'
        setError(`${resource}: ${message}`)
      }
      throw reason
    }

    /** Rechaza un JSON inesperado antes de usarlo en la presentación. */
    function requireArray<T>(items: T[]): T[] {
      if (!Array.isArray(items)) throw new SyntaxError('Respuesta de detalle inesperada')
      return items
    }

    async function loadCustomer() {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setIsLoading(true)
      setError(null)
      setCustomer(null)
      setContacts(null)
      setAddress(null)
      const id = parseEntityId(customerID)
      if (id === null) {
        setError('Cliente no encontrado')
        setIsLoading(false)
        return
      }

      try {
        const [details, customerContacts, customerAddress] = await Promise.all([
          getCustomerByID(id).then(requireArray).catch(reason => readFailed(reason, 'Detalle del cliente')),
          getCustomerContactsByID(id).then(requireArray).catch(reason => readFailed(reason, 'Contactos del cliente')),
          getCustomerAddressByID(id).then(requireArray).catch(reason => readFailed(reason, 'Direcciones del cliente')),
        ])

        if (cancelled || !isSessionCurrent(requestRevision)) return
        if (!details[0]) {
          setError('Cliente no encontrado')
          return
        }
        if (details[0].CustomerID !== id) {
          setError('No fue posible confirmar el detalle del cliente solicitado. Intente nuevamente.')
          return
        }

        setCustomer(details[0])
        setContacts(customerContacts[0] ?? null)
        setAddress(customerAddress[0] ?? null)
      } catch {
        if (!cancelled && isSessionCurrent(requestRevision)) {
          setCustomer(null)
          setContacts(null)
          setAddress(null)
        }
      } finally {
        if (!cancelled && isSessionCurrent(requestRevision)) setIsLoading(false)
      }
    }

    queueMicrotask(() => { void loadCustomer() })
    return () => { cancelled = true }
  }, [customerID, refreshKey, revision, isSessionCurrent, invalidateSession])

  const mapUrl = osmEmbedUrl(address?.Latitud, address?.Longitud)
  const website = customer?.SitioWeb && /^https?:\/\//i.test(customer.SitioWeb) ? customer.SitioWeb : null

  return (
    <main className="flex min-w-0 flex-1 bg-muted/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <BackLink href="/">Volver a clientes</BackLink>

        {isLoading && <DetailSkeleton label="Cargando cliente..." />}
        {!isLoading && error && <DetailError message={error} onRetry={parseEntityId(customerID) !== null ? () => setRefreshKey(key => key + 1) : undefined} />}

        {!isLoading && !error && customer && (
          <>
            <DetailHero
              badge={initials(customer.NombreCliente)}
              eyebrow={`Cliente #${customer.CustomerID}`}
              title={customer.NombreCliente}
              tags={<>
                <Badge variant="secondary"><TagIcon aria-hidden="true" />{customer.NombreCategoriaCliente}</Badge>
                <Badge variant="outline"><TruckIcon aria-hidden="true" />{customer.NombreMetodoEntrega}</Badge>
                {customer.NombreGrupoCompra && <Badge variant="outline"><UsersRoundIcon aria-hidden="true" />{customer.NombreGrupoCompra}</Badge>}
              </>}
              // action={<Button nativeButton={false} render={<Link href={`/customers/${customer.CustomerID}/edit`} />} className="shrink-0"><PencilIcon data-icon="inline-start" />Editar cliente</Button>}
              stats={[
                { icon: CalendarClockIcon, label: 'Días para pagar', value: String(customer.DiasGraciaPago) },
                { icon: ReceiptTextIcon, label: 'Se factura a', value: customer.NombreClientePorFacturar, title: customer.NombreClientePorFacturar },
                { icon: PhoneIcon, label: 'Teléfono principal', value: contacts?.TelefonoPrincipal },
                { icon: GlobeIcon, label: 'Sitio web', value: website, href: website ?? undefined, title: website ?? undefined },
              ]}
            />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-6 lg:col-span-2">
                <SectionCard icon={MapPinIcon} title="Direcciones" description="Entrega y correspondencia del cliente.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <AddressBlock title="Dirección de entrega" lines={[address?.DireccionEntrega1, address?.DireccionEntrega2, [address?.CiudadEntrega, address?.ProvinciaEntrega, address?.PaisEntrega].filter(Boolean).join(', ')]} postalCode={address?.CodigoPostalEntrega} />
                    <AddressBlock title="Dirección postal" lines={[address?.DireccionPostal1, address?.DireccionPostal2, [address?.CiudadPostal, address?.ProvinciaPostal, address?.PaisPostal].filter(Boolean).join(', ')]} postalCode={address?.CodigoPostalPostal} />
                  </div>
                </SectionCard>
                <MapCard url={mapUrl} title={`Ubicación de entrega de ${customer.NombreCliente}`} emptyMessage="Este cliente no tiene coordenadas disponibles." />
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
