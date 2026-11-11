'use client'

import { useEffect, useRef, useState } from 'react'
// import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CalendarClockIcon, GlobeIcon, LandmarkIcon, MapPinIcon, PhoneIcon, PrinterIcon, TagIcon, TruckIcon, UsersIcon } from 'lucide-react'
import { AddressBlock, BackLink, ContactBlock, DetailError, DetailHero, DetailItem, DetailSectionFeedback, DetailSkeleton, MapCard, SectionCard, osmEmbedUrl, type DetailLoadState } from '@/components/detail-kit'
import { initials } from '@/components/list-kit'
import { Badge } from '@/components/ui/badge'
// import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSession } from '@/components/auth-session'
import { getSupplierAddressByID, getSupplierByID, getSupplierContactsByID, getSupplierPrivateByID } from '@/app/api/suppliers'
import { parseEntityId } from '@/lib/helpers/entityValidation'
import { rowWithIdSchema, singleRowResponseSchema } from '@/lib/schemas/responses'
import type { SupplierAddress, SupplierContact, SupplierDetail, SupplierPrivateDetail, SupplierRouteParams } from '@/lib/types/suppliers'

function requireRow<T>(items: T[]): T {
  if (!singleRowResponseSchema.safeParse(items).success) throw new SyntaxError('Respuesta de detalle inesperada')
  return items[0]
}

function requestMessage(reason: unknown, resource: string) {
  const status = reason instanceof Error ? reason.cause : null
  if (status === 403) return `${resource}: Sin permisos para consultar estos datos.`
  if (reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503)) return `${resource}: No fue posible cargar los datos. Intente nuevamente.`
  return `${resource}: ${reason instanceof Error ? reason.message : 'No disponible.'}`
}

export default function SupplierDetailPage() {
  const { supplierID } = useParams<SupplierRouteParams>()
  return <SupplierDetailContent key={supplierID} supplierID={supplierID} />
}

/** Carga por separado la ficha local y las secciones privadas del proveedor. */
function SupplierDetailContent({ supplierID }: { supplierID: string }) {
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null)
  const [privateDetails, setPrivateDetails] = useState<SupplierPrivateDetail | null>(null)
  const [contacts, setContacts] = useState<SupplierContact | null>(null)
  const [address, setAddress] = useState<SupplierAddress | null>(null)
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

    async function loadSupplier() {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setIsLoading(true)
      setError(null)
      setSupplier(null)

      const id = parseEntityId(supplierID)
      if (id === null) {
        setError('Proveedor no encontrado')
        setIsLoading(false)
        return
      }

      try {
        const details = requireRow(await getSupplierByID(id))
        if (cancelled || !isSessionCurrent(requestRevision)) return
        if (!rowWithIdSchema('SupplierID', id).safeParse(details).success) throw new SyntaxError('El proveedor no corresponde a la solicitud')
        setSupplier(details)
      } catch (reason) {
        if (reason instanceof Error && reason.cause === 401) invalidateSession(requestRevision)
        else if (!cancelled && isSessionCurrent(requestRevision)) setError(requestMessage(reason, 'Detalle del proveedor'))
      } finally {
        if (!cancelled && isSessionCurrent(requestRevision)) setIsLoading(false)
      }
    }

    queueMicrotask(() => { void loadSupplier() })
    return () => { cancelled = true }
  }, [supplierID, refreshKey, revision, isSessionCurrent, invalidateSession])

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
      const id = parseEntityId(supplierID)
      if (id === null) return
      setPrivateDetails(null)
      setContacts(null)
      setAddress(null)
      setPrivateState({ loading: true, error: null })
      setContactsState({ loading: true, error: null })
      setAddressState({ loading: true, error: null })

      void getSupplierPrivateByID(id).then(requireRow).then(details => {
        if (!rowWithIdSchema('SupplierID', id).safeParse(details).success) throw new SyntaxError('Los datos privados no corresponden al proveedor')
        if (!isActive()) return
        setPrivateDetails(details)
        setPrivateState({ loading: false, error: null })
      }).catch(reason => failed(reason, setPrivateState, 'Datos privados del proveedor'))

      void getSupplierContactsByID(id).then(requireRow).then(details => {
        if (!isActive()) return
        setContacts(details)
        setContactsState({ loading: false, error: null })
      }).catch(reason => failed(reason, setContactsState, 'Contactos del proveedor'))

      void getSupplierAddressByID(id).then(requireRow).then(details => {
        if (!isActive()) return
        setAddress(details)
        setAddressState({ loading: false, error: null })
      }).catch(reason => failed(reason, setAddressState, 'Direcciones del proveedor'))
    }

    queueMicrotask(loadPrivate)
    return () => { cancelled = true }
  }, [supplierID, privateRefreshKey, revision, isSessionCurrent, invalidateSession])

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
    setSupplier(null)
    retryPrivate()
    setRefreshKey(key => key + 1)
  }

  const mapUrl = osmEmbedUrl(address?.Latitud, address?.Longitud)
  const website = privateDetails?.SitioWeb && /^https?:\/\//i.test(privateDetails.SitioWeb) ? privateDetails.SitioWeb : null
  const privatePending = privateState.loading ? 'Cargando...' : privateState.error ? 'No disponible' : null

  return (
    <main className="flex min-w-0 flex-1 bg-muted/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <BackLink href="/suppliers">Volver a proveedores</BackLink>

        {isLoading && <DetailSkeleton label="Cargando proveedor..." />}
        {!isLoading && error && <DetailError message={error} onRetry={parseEntityId(supplierID) !== null ? retryDetail : undefined} />}

        {!isLoading && !error && supplier && (
          <>
            <DetailHero
              badge={initials(supplier.NombreProveedor)}
              eyebrow={`Proveedor #${supplier.SupplierID}${privateDetails?.CodigoProveedor ? ` · ${privateDetails.CodigoProveedor}` : ''}`}
              title={supplier.NombreProveedor}
              tags={<>
                <Badge variant="secondary"><TagIcon aria-hidden="true" />{supplier.NombreCategoriaProveedor}</Badge>
                <Badge variant="outline"><TruckIcon aria-hidden="true" />{supplier.NombreMetodoEntrega ?? 'Sin método de entrega'}</Badge>
              </>}
              // action={<Button nativeButton={false} render={<Link href={`/suppliers/${supplier.SupplierID}/edit`} />} className="shrink-0"><PencilIcon data-icon="inline-start" />Editar proveedor</Button>}
              stats={[
                { icon: CalendarClockIcon, label: 'Días para pagar', value: String(supplier.DiasGraciaPago) },
                { icon: PhoneIcon, label: 'Teléfono', value: privatePending ?? privateDetails?.Telefono },
                { icon: PrinterIcon, label: 'Fax', value: privatePending ?? privateDetails?.Fax },
                { icon: GlobeIcon, label: 'Sitio web', value: privatePending ?? website, href: website ?? undefined, title: website ?? undefined },
              ]}
            />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-6 lg:col-span-2">
                <SectionCard icon={MapPinIcon} title="Direcciones" description="Entrega y correspondencia del proveedor.">
                  <DetailSectionFeedback state={addressState} label="Consultando direcciones en Corporativo..." onRetry={retryPrivate}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <AddressBlock title="Dirección de entrega" lines={[address?.DireccionEntrega1, address?.DireccionEntrega2, [address?.CiudadEntrega, address?.ProvinciaEntrega, address?.PaisEntrega].filter(Boolean).join(', ')]} postalCode={address?.CodigoPostalEntrega} />
                      <AddressBlock title="Dirección postal" lines={[address?.DireccionPostal1, address?.DireccionPostal2, [address?.CiudadPostal, address?.ProvinciaPostal, address?.PaisPostal].filter(Boolean).join(', ')]} postalCode={address?.CodigoPostalPostal} />
                    </div>
                  </DetailSectionFeedback>
                </SectionCard>

                <SectionCard icon={LandmarkIcon} title="Datos bancarios" description="Información para pagos al proveedor.">
                  <DetailSectionFeedback state={privateState} label="Consultando datos privados en Corporativo..." onRetry={retryPrivate}>
                    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                      <DetailItem label="Nombre de la cuenta" value={privateDetails?.NombreBanco} />
                      <DetailItem label="Sucursal" value={privateDetails?.SucursalBanco} />
                      <DetailItem label="Número de cuenta" value={privateDetails?.NumeroCuentaBancaria} mono />
                      <DetailItem label="Código SWIFT" value={privateDetails?.CodigoSwift} mono />
                    </dl>
                  </DetailSectionFeedback>
                </SectionCard>

                <MapCard url={mapUrl} title={`Ubicación de entrega de ${supplier.NombreProveedor}`} emptyMessage="Este proveedor no tiene coordenadas disponibles." state={addressState} onRetry={retryPrivate} />
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
