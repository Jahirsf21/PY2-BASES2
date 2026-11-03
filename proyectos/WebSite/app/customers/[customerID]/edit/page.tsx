'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getCustomerForEdit } from '@/app/api/customers'
import { CustomerForm } from '@/app/customers/customer-form'
import { useSession } from '@/components/auth-session'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { parseEntityId } from '@/lib/helpers/entityValidation'
import type { CustomerEdit, CustomerRouteParams } from '@/lib/types/customers'

/** Separa los borradores de clientes distintos al cambiar la URL. */
export default function EditCustomerPage() {
  const { customerID } = useParams<CustomerRouteParams>()
  return <EditCustomerContent key={customerID} customerID={customerID} />
}

/** No monta el formulario hasta disponer de su precarga y sesión vigentes. */
function EditCustomerContent({ customerID }: { customerID: string }) {
  const { revision, isSessionCurrent, invalidateSession } = useSession()
  const [customer, setCustomer] = useState<CustomerEdit | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const requestRevision = revision
    /** Hace visible el fallo de precarga sin publicar avisos de una sesión anterior. */
    function showError(message: string) {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setError(message)
      toast.add({ type: 'error', title: 'No se pudo cargar el cliente para editar', description: message, priority: 'high', timeout: 8000 })
    }
    async function load() {
      if (cancelled || !isSessionCurrent(requestRevision)) return
      setLoading(true)
      setError(null)
      setCustomer(null)
      const id = parseEntityId(customerID)
      if (id === null) {
        showError('Cliente no encontrado')
        setLoading(false)
        return
      }
      try {
        const data = await getCustomerForEdit(id)
        if (cancelled || !isSessionCurrent(requestRevision)) return
        if (data === null || typeof data !== 'object' || data.CustomerID !== id) throw new SyntaxError('Precarga inesperada')
        setCustomer(data)
      } catch (reason) {
        const status = reason instanceof Error ? reason.cause : null
        if (status === 401) {
          invalidateSession(requestRevision)
          return
        }
        let message = reason instanceof Error ? reason.message : 'No fue posible cargar el cliente.'
        if (status === 403) message = 'Sin permisos para cargar el cliente para editar.'
        else if (reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503)) message = 'No fue posible cargar el cliente. Intente nuevamente.'
        showError(message)
      } finally {
        if (!cancelled && isSessionCurrent(requestRevision)) setLoading(false)
      }
    }
    queueMicrotask(() => { void load() })
    return () => { cancelled = true }
  }, [customerID, refreshKey, revision, isSessionCurrent, invalidateSession])

  if (customer && !error) return <CustomerForm key={customer.CustomerID} initial={customer} />

  return (
    <main className="flex min-w-0 flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-8 sm:py-8">
        <Link href={`/customers/${customerID}`} className="text-sm text-muted-foreground hover:underline">Volver al detalle</Link>
        {loading && !error && <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Cargando cliente...</p>}
        {!loading && error && (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <p role="alert" className="text-sm text-destructive">{error}</p>
            {parseEntityId(customerID) !== null && <Button type="button" variant="outline" onClick={() => setRefreshKey(key => key + 1)}>Reintentar precarga</Button>}
          </div>
        )}
      </div>
    </main>
  )
}
