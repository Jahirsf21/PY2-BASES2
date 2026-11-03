'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeftIcon, ExternalLinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  const mapUrl = address?.Latitud != null && address.Longitud != null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${address.Longitud - 0.02}%2C${address.Latitud - 0.01}%2C${address.Longitud + 0.02}%2C${address.Latitud + 0.01}&layer=mapnik&marker=${address.Latitud}%2C${address.Longitud}`
    : null

  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Volver a clientes
        </Link>

        {isLoading && <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Cargando cliente...</p>}
        {!isLoading && error && (
          <div className="space-y-3 rounded-lg border bg-card p-6">
            <p role="alert" className="text-sm text-destructive">{error}</p>
            {parseEntityId(customerID) !== null && <Button type="button" variant="outline" onClick={() => setRefreshKey(key => key + 1)}>Reintentar detalle</Button>}
          </div>
        )}

        {!isLoading && !error && customer && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cliente #{customer.CustomerID}</p>
                <h1 className="break-words text-2xl font-semibold tracking-tight">{customer.NombreCliente}</h1>
              </div>
              <Button nativeButton={false} render={<Link href={`/customers/${customer.CustomerID}/edit`} />} variant="outline">Editar cliente</Button>
            </div>

            <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="general-title">
              <h2 id="general-title" className="mb-4 text-lg font-semibold">Datos generales</h2>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div><dt className="text-sm text-muted-foreground">Categoría</dt><dd className="break-words font-medium">{customer.NombreCategoriaCliente}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Grupo de compra</dt><dd className="break-words font-medium">{customer.NombreGrupoCompra ?? 'No asignado'}</dd></div>
                <div>
                  <dt className="text-sm text-muted-foreground">Cliente por facturar</dt>
                  <dd className="break-words font-medium">{customer.NombreClientePorFacturar}</dd>
                </div>
                <div><dt className="text-sm text-muted-foreground">Método de entrega</dt><dd className="break-words font-medium">{customer.NombreMetodoEntrega}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Días de gracia para pagar</dt><dd className="font-medium">{customer.DiasGraciaPago}</dd></div>
                <div>
                  <dt className="text-sm text-muted-foreground">Sitio web</dt>
                  <dd className="break-all font-medium">
                    {customer.SitioWeb && /^https?:\/\//i.test(customer.SitioWeb) ? (
                      <a href={customer.SitioWeb} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-foreground underline underline-offset-2">
                        {customer.SitioWeb} <ExternalLinkIcon className="size-3 shrink-0" aria-hidden="true" />
                      </a>
                    ) : 'No disponible'}
                  </dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="contacts-title">
              <h2 id="contacts-title" className="mb-3 text-lg font-semibold">Contactos</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
                  <h3 className="mb-3 font-medium">Contacto principal</h3>
                  <dl className="space-y-3 text-sm">
                    <div><dt className="text-muted-foreground">Nombre</dt><dd className="break-words">{contacts?.NombreContactoPrincipal ?? 'No disponible'}</dd></div>
                    <div><dt className="text-muted-foreground">Teléfono</dt><dd>{contacts?.TelefonoPrincipal ?? 'No disponible'}</dd></div>
                    <div><dt className="text-muted-foreground">Fax</dt><dd>{contacts?.FaxPrincipal ?? 'No disponible'}</dd></div>
                    <div><dt className="text-muted-foreground">Correo</dt><dd className="break-all">{contacts?.CorreoPrincipal ?? 'No disponible'}</dd></div>
                  </dl>
                </div>
                <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
                  <h3 className="mb-3 font-medium">Contacto alternativo</h3>
                  <dl className="space-y-3 text-sm">
                    <div><dt className="text-muted-foreground">Nombre</dt><dd className="break-words">{contacts?.NombreContactoAlternativo ?? 'No disponible'}</dd></div>
                    <div><dt className="text-muted-foreground">Teléfono</dt><dd>{contacts?.TelefonoAlternativo ?? 'No disponible'}</dd></div>
                    <div><dt className="text-muted-foreground">Fax</dt><dd>{contacts?.FaxAlternativo ?? 'No disponible'}</dd></div>
                    <div><dt className="text-muted-foreground">Correo</dt><dd className="break-all">{contacts?.CorreoAlternativo ?? 'No disponible'}</dd></div>
                  </dl>
                </div>
              </div>
            </section>

            <section aria-labelledby="addresses-title">
              <h2 id="addresses-title" className="mb-3 text-lg font-semibold">Direcciones</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
                  <h3 className="mb-3 font-medium">Dirección de entrega</h3>
                  <address className="space-y-1 break-words text-sm not-italic">
                    <p>{address?.DireccionEntrega1 ?? 'No disponible'}</p>
                    {address?.DireccionEntrega2 && <p>{address.DireccionEntrega2}</p>}
                    <p>{[address?.CiudadEntrega, address?.ProvinciaEntrega, address?.PaisEntrega].join(', ')}</p>
                    <p>Código postal: {address?.CodigoPostalEntrega ?? 'No disponible'}</p>
                  </address>
                </div>
                <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
                  <h3 className="mb-3 font-medium">Dirección postal</h3>
                  <address className="space-y-1 break-words text-sm not-italic">
                    <p>{address?.DireccionPostal1 ?? 'No disponible'}</p>
                    {address?.DireccionPostal2 && <p>{address.DireccionPostal2}</p>}
                    <p>{[address?.CiudadPostal, address?.ProvinciaPostal, address?.PaisPostal].join(', ')}</p>
                    <p>Código postal: {address?.CodigoPostalPostal ?? 'No disponible'}</p>
                  </address>
                </div>
              </div>
            </section>

            <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="location-title">
              <h2 id="location-title" className="mb-3 text-lg font-semibold">Ubicación de entrega</h2>
              {mapUrl ? (
                <iframe
                  title={`Ubicación de entrega de ${customer.NombreCliente}`}
                  src={mapUrl}
                  loading="lazy"
                  className="h-72 w-full rounded-lg border sm:h-96"
                  referrerPolicy="no-referrer"
                />
              ) : <p className="text-sm text-muted-foreground">Este cliente no tiene coordenadas disponibles.</p>}
            </section>
          </>
        )}
      </div>
    </main>
  )
}
