'use client'

import { useCallback, useEffect, useRef, useState, type SubmitEvent } from 'react'
import { LogInIcon } from 'lucide-react'
import { login } from '@/app/api/auth'
import { useSession } from '@/components/auth-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { branches } from '@/lib/helpers/session'
import type { Node } from '@/lib/types/auth'

/**
 * Presenta el formulario de login y activa la sesión compartida tras autenticar.
 *
 * @returns Formulario de credenciales y selección de sucursal.
 */
export default function LoginPage() {
  const { checking, error: sessionError, startSession } = useSession()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)

  /**
   * Cancela el login pendiente e impide aplicar una respuesta tardía.
   */
  const cancelRequest = useCallback(() => {
    request.current?.abort()
    request.current = null
  }, [])

  useEffect(() => {
    /** Cancela el envío si el navegador abandona o conserva esta página. */
    function cancelOnPageHide() {
      cancelRequest()
      setSubmitting(false)
    }
    window.addEventListener('pagehide', cancelOnPageHide)
    return () => {
      cancelRequest()
      window.removeEventListener('pagehide', cancelOnPageHide)
    }
  }, [cancelRequest])

  /**
   * Envía las credenciales mediante el login directo y guarda la respuesta válida.
   *
   * @param event Envío del formulario de credenciales.
   */
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (checking || request.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    const node = String(data.get('node')) as Node
    const controller = new AbortController()
    request.current = controller
    setSubmitting(true)
    setError(null)
    try {
      const result = await login({
        userName: String(data.get('userName') ?? '').trim(),
        password: String(data.get('password') ?? ''),
        node,
      }, controller.signal)
      if (controller.signal.aborted || request.current !== controller) return
      startSession(result, node)
      form.reset()
    } catch (reason) {
      if (!controller.signal.aborted && request.current === controller) {
        setError(reason instanceof Error ? reason.message : 'No fue posible iniciar sesión.')
      }
    } finally {
      if (request.current === controller) {
        request.current = null
        setSubmitting(false)
      }
    }
  }

  const message = error ?? (submitting ? null : sessionError)

  return (
    <main lang="es" className="flex min-w-0 flex-1 items-center justify-center bg-muted/30 px-4 py-8">
      <section className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm sm:p-8" aria-labelledby="login-title">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">World Wide Importers</p>
          <h1 id="login-title" className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground">Ingrese sus credenciales y seleccione la sucursal.</p>
        </div>
        {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
        <form onSubmit={event => void submit(event)} aria-busy={submitting}>
          <fieldset disabled={submitting} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="userName">Usuario</Label>
              <Input id="userName" name="userName" autoComplete="username" maxLength={50} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" maxLength={255} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="node">Sucursal</Label>
              <select id="node" name="node" defaultValue="" required className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50">
                <option value="" disabled>Seleccione una sucursal</option>
                {branches.map(branch => <option key={branch.value} value={branch.value}>{branch.label}</option>)}
              </select>
            </div>
            <Button type="submit" className="w-full"><LogInIcon data-icon="inline-start" />{submitting ? 'Ingresando...' : 'Iniciar sesión'}</Button>
          </fieldset>
        </form>
      </section>
    </main>
  )
}
