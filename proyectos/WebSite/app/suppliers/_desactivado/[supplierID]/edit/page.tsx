// 'use client'
//
// import { useEffect, useState } from 'react'
// import Link from 'next/link'
// import { useParams } from 'next/navigation'
// import { getSupplierForEdit } from '@/app/api/suppliers'
// import { SupplierForm } from '@/app/suppliers/supplier-form'
// import { Button } from '@/components/ui/button'
// import { useSession } from '@/components/auth-session'
// import { parseEntityId } from '@/lib/helpers/entityValidation'
// import type { SupplierEdit, SupplierRouteParams } from '@/lib/types/suppliers'
//
// export default function EditSupplierPage() {
//   const { supplierID } = useParams<SupplierRouteParams>()
//   return <EditSupplierContent key={supplierID} supplierID={supplierID} />
// }
//
// /** Solo monta un formulario con precarga válida del ID y revisión actuales. */
// function EditSupplierContent({ supplierID }: { supplierID: string }) {
//   const { revision, isSessionCurrent, invalidateSession } = useSession()
//   const [supplier, setSupplier] = useState<SupplierEdit | null>(null)
//   const [error, setError] = useState<string | null>(null)
//   const [refreshKey, setRefreshKey] = useState(0)
//
//   useEffect(() => {
//     let cancelled = false
//     const requestRevision = revision
//     queueMicrotask(async () => {
//       if (cancelled || !isSessionCurrent(requestRevision)) return
//       setSupplier(null)
//       setError(null)
//       const id = parseEntityId(supplierID)
//       if (id === null) { setError('Proveedor no encontrado'); return }
//       try {
//         const data = await getSupplierForEdit(id)
//         if (cancelled || !isSessionCurrent(requestRevision)) return
//         if (!data || data.SupplierID !== id) throw new SyntaxError('Precarga inesperada')
//         setSupplier(data)
//       } catch (reason) {
//         const status = reason instanceof Error ? reason.cause : null
//         if (status === 401) { invalidateSession(requestRevision); return }
//         if (!cancelled && isSessionCurrent(requestRevision)) setError(status === 403 ? 'Sin permisos para editar proveedores.' : reason instanceof TypeError || reason instanceof SyntaxError || (typeof status === 'number' && status >= 500 && status !== 503) ? 'No fue posible cargar el proveedor. Intente nuevamente.' : reason instanceof Error ? reason.message : 'No fue posible cargar el proveedor.')
//       }
//     })
//     return () => { cancelled = true }
//   }, [supplierID, refreshKey, revision, isSessionCurrent, invalidateSession])
//
//   if (supplier && !error) return <SupplierForm key={supplier.SupplierID} initial={supplier} />
//   return (
//     <main className="flex min-w-0 flex-1 bg-muted/30"><div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-8 sm:py-8">
//       <Link href={`/suppliers/${supplierID}`} className="text-sm text-muted-foreground hover:underline">Volver al detalle</Link>
//       {!error && <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Cargando proveedor...</p>}
//       {error && <div className="space-y-3 rounded-lg border bg-card p-4"><p role="alert" className="text-sm text-destructive">{error}</p>{parseEntityId(supplierID) !== null && <Button type="button" variant="outline" onClick={() => setRefreshKey(key => key + 1)}>Reintentar precarga</Button>}</div>}
//     </div></main>
//   )
// }
