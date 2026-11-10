'use client'

import { useEffect, useRef, useState } from 'react'
// import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CalendarClockIcon, GlobeIcon, MapPinIcon, PhoneIcon, ReceiptTextIcon, TagIcon, TruckIcon, UsersIcon, UsersRoundIcon } from 'lucide-react'
import { AddressBlock, BackLink, ContactBlock, DetailError, DetailHero, DetailSectionFeedback, DetailSkeleton, MapCard, SectionCard, osmEmbedUrl, type DetailLoadState } from '@/components/detail-kit'
import { initials } from '@/components/list-kit'
import { Badge } from '@/components/ui/badge'
// import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getCustomerAddressByID, getCustomerByID, getCustomerContactsByID, getCustomerPrivateByID } from '@/app/api/customers'
import { useSession } from '@/components/auth-session'
import { parseEntityId } from '@/lib/helpers/entityValidation'
import type { CustomerAddress, CustomerContact, CustomerDetail, CustomerPrivateDetail, CustomerRouteParams } from '@/lib/types/customers'

function requireRow<T>(items: T[]): T {
  if (!Array.isArray(items) || items.length !== 1 || !items[0] || typeof items[0] !== 'object' || Array.isArray(items[0])) throw new SyntaxError('Respuesta de detalle inesperada')
  return items[0]
}

function requestMessage(reason: unknown, resource: string) {
  const status = reason instanceof Error ? reason.cause : null
  if (status === 403) return `${resource}: Sin permisos para consultar estos datos.`
  if (reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503)) return `${resource}: No fue posible cargar los datos. Intente nuevamente.`
  return `${resource}: ${reason instanceof Error ? reason.message : 'No disponible.'}`
}

/** Reinicia el detalle inmediatamente al cambiar el identificador de la ruta. */
export default function CustomerDetailPage() {
  const { customerID } = useParams<CustomerRouteParams>()
  return <CustomerDetailContent key={customerID} customerID={customerID} />
}

/** Carga los datos locales y privados sin vincular sus resultados entre sí. */
function CustomerDetailContent({ customerID }: { customerID: string }) {
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [privateDetails, setPrivateDetails] = useState<CustomerPrivateDetail | null>(null)
  const [contacts, setContacts] = useState<CustomerContact | null>(null)
  const [address, setAddress] = useState<CustomerAddress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [privateRefreshKey, setPrivateRefreshKey] = useState(0)
  const [privateState, setPrivateState] = useState<DetailLoadState>({ loading: true, error: null })
  const [contactsState, setContactsState] = useState<DetailLoadState>({ loading: true, error: null })
  const [addressState, setAddressState] = useState<DetailLoadState>({ loading: true, error: null })
  const privateRequestId = useRef(0)

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision

    async function loadCustomer() {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setIsLoading(true)
      setError(null)
      setCustomer(null)
      const id = parseEntityId(customerID)
      if (id === null) {
        setError('Cliente no encontrado')
        setIsLoading(false)
        return
      }

      try {
        const details = requireRow(await getCustomerByID(id))
        if (cancelled || !isSessionCurrent(requestRevision)) return
        if (details.CustomerID !== id) throw new SyntaxError('El cliente no corresponde a la solicitud')
        setCustomer(details)
      } catch (reason) {
        if (reason instanceof Error && reason.cause === 401) invalidateSession(requestRevision)
        else if (!cancelled && isSessionCurrent(requestRevision)) setError(requestMessage(reason, 'Detalle del cliente'))
      } finally {
        if (!cancelled && isSessionCurrent(requestRevision)) setIsLoading(false)
      }
    }

    queueMicrotask(() => { void loadCustomer() })
    return () => { cancelled = true }
  }, [customerID, refreshKey, revision, isSessionCurrent, invalidateSession])

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision
    const requestId = ++privateRequestId.current
    const isActive = () => !cancelled && requestId === privateRequestId.current && isSessionCurrent(requestRevision)

    function failed(reason: unknown, setState: (state: DetailLoadState) => void, resource: string) {
      if (reason instanceof Error && reason.cause === 401) invalidateSession(requestRevision)
      else if (isActive()) setState({ loading: false, error: requestMessage(reason, resource) })
    }

    function loadPrivate() {
      if (!isActive()) return
      const id = parseEntityId(customerID)
      if (id === null) return
      setPrivateDetails(null)
      setContacts(null)
      setAddress(null)
      setPrivateState({ loading: true, error: null })
      setContactsState({ loading: true, error: null })
      setAddressState({ loading: true, error: null })

      void getCustomerPrivateByID(id).then(requireRow).then(details => {
        if (details.CustomerID !== id) throw new SyntaxError('Los datos privados no corresponden al cliente')
        if (!isActive()) return
        setPrivateDetails(details)
        setPrivateState({ loading: false, error: null })
      }).catch(reason => failed(reason, setPrivateState, 'Datos privados del cliente'))

      void getCustomerContactsByID(id).then(requireRow).then(details => {
        if (!isActive()) return
        setContacts(details)
        setContactsState({ loading: false, error: null })
      }).catch(reason => failed(reason, setContactsState, 'Contactos del cliente'))

      void getCustomerAddressByID(id).then(requireRow).then(details => {
        if (!isActive()) return
        setAddress(details)
        setAddressState({ loading: false, error: null })
      }).catch(reason => failed(reason, setAddressState, 'Direcciones del cliente'))
    }

    queueMicrotask(loadPrivate)
    return () => { cancelled = true }
  }, [customerID, privateRefreshKey, revision, isSessionCurrent, invalidateSession])

  function retryPrivate() {
    privateRequestId.current++
    setPrivateDetails(null)
    setContacts(null)
    setAddress(null)
    setPrivateState({ loading: true, error: null })
    setContactsState({ loading: true, error: null })
    setAddressState({ loading: true, error: null })
    setPrivateRefreshKey(key => key + 1)
  }

  function retryDetail() {
    setIsLoading(true)
    setError(null)
    setCustomer(null)
    retryPrivate()
    setRefreshKey(key => key + 1)
  }

  const mapUrl = osmEmbedUrl(address?.Latitud, address?.Longitud)
  const website = privateDetails?.SitioWeb && /^https?:\/\//i.test(privateDetails.SitioWeb) ? privateDetails.SitioWeb : null
  const privatePending = privateState.loading ? 'Cargando...' : privateState.error ? 'No disponible' : null
  const contactsPending = contactsState.loading ? 'Cargando...' : contactsState.error ? 'No disponible' : null

  return (
    <main className="flex min-w-0 flex-1 bg-muted/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <BackLink href="/">Volver a clientes</BackLink>

        {isLoading && <DetailSkeleton label="Cargando cliente..." />}
        {!isLoading && error && <DetailError message={error} onRetry={parseEntityId(customerID) !== null ? retryDetail : undefined} />}

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
                { icon: PhoneIcon, label: 'Teléfono principal', value: contactsPending ?? contacts?.TelefonoPrincipal },
                { icon: GlobeIcon, label: 'Sitio web', value: privatePending ?? website, href: website ?? undefined, title: website ?? undefined },
              ]}
            />

            <DetailSectionFeedback state={privateState} label="Consultando sitio web en Corporativo..." onRetry={retryPrivate} />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-6 lg:col-span-2">
                <SectionCard icon={MapPinIcon} title="Direcciones" description="Entrega y correspondencia del cliente.">
                  <DetailSectionFeedback state={addressState} label="Consultando direcciones en Corporativo..." onRetry={retryPrivate}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <AddressBlock title="Dirección de entrega" lines={[address?.DireccionEntrega1, address?.DireccionEntrega2, [address?.CiudadEntrega, address?.ProvinciaEntrega, address?.PaisEntrega].filter(Boolean).join(', ')]} postalCode={address?.CodigoPostalEntrega} />
                      <AddressBlock title="Dirección postal" lines={[address?.DireccionPostal1, address?.DireccionPostal2, [address?.CiudadPostal, address?.ProvinciaPostal, address?.PaisPostal].filter(Boolean).join(', ')]} postalCode={address?.CodigoPostalPostal} />
                    </div>
                  </DetailSectionFeedback>
                </SectionCard>
                <MapCard url={mapUrl} title={`Ubicación de entrega de ${customer.NombreCliente}`} emptyMessage="Este cliente no tiene coordenadas disponibles." state={addressState} onRetry={retryPrivate} />
              </div>

              <div className="min-w-0 space-y-6">
                <SectionCard icon={UsersIcon} title="Contactos">
                  <DetailSectionFeedback state={contactsState} label="Consultando contactos en Corporativo..." onRetry={retryPrivate}>
                    <div className="space-y-4">
                      <ContactBlock role="Principal" name={contacts?.NombreContactoPrincipal} phone={contacts?.TelefonoPrincipal} fax={contacts?.FaxPrincipal} email={contacts?.CorreoPrincipal} />
                      <Separator />
                      <ContactBlock role="Alternativo" name={contacts?.NombreContactoAlternativo} phone={contacts?.TelefonoAlternativo} fax={contacts?.FaxAlternativo} email={contacts?.CorreoAlternativo} />
                    </div>
                  </DetailSectionFeedback>
                </SectionCard>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
