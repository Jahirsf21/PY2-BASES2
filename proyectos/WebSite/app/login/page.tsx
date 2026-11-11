'use client'

import { useCallback, useEffect, useRef, useState, type SubmitEvent } from 'react'
import { AlertCircleIcon, Building2Icon, ChartNoAxesCombinedIcon, CheckCircle2Icon, EyeIcon, EyeOffIcon, Loader2Icon, LockIcon, LogInIcon, ShieldAlertIcon, UserIcon, type LucideIcon } from 'lucide-react'
import { login } from '@/app/api/auth'
import { useSession } from '@/components/auth-session'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { branches } from '@/lib/helpers/session'
import { loginFormSchema } from '@/lib/schemas/auth'
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
  /** Rechazo del servidor al autenticar; se presenta en un diálogo de alerta. */
  const [authError, setAuthError] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [showPassword, setShowPassword] = useState(false)

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
    const validation = loginFormSchema.safeParse({
      userName: data.get('userName'), password: data.get('password'), node: data.get('node'),
    })
    if (!validation.success) {
      const issue = validation.error.issues[0]
      setError(issue.message)
      form.querySelector<HTMLInputElement>(issue.path[0] === 'node' ? 'input[name="node"]' : `#${String(issue.path[0])}`)?.focus()
      return
    }
    const input = validation.data
    const controller = new AbortController()
    request.current = controller
    setSubmitting(true)
    setError(null)
    setAuthError(null)
    try {
      const result = await login(input, controller.signal)
      if (controller.signal.aborted || request.current !== controller) return
      startSession(result, input.node)
      form.reset()
    } catch (reason) {
      if (!controller.signal.aborted && request.current === controller) {
        setAuthError(reason instanceof Error ? reason.message : 'No fue posible iniciar sesión.')
        // No conserva la contraseña rechazada; el usuario y la sucursal se mantienen.
        // El foco vuelve a la contraseña al cerrar el diálogo (finalFocus).
        if (passwordRef.current) passwordRef.current.value = ''
      }
    } finally {
      if (request.current === controller) {
        request.current = null
        setSubmitting(false)
      }
    }
  }

  const message = error ?? (submitting ? null : sessionError)
  const invalidCredentials = authError === 'Credenciales inválidas'

  return (
    <main lang="es" className="grid min-w-0 flex-1 bg-muted/40">
      <div className="flex min-w-0 items-center justify-center px-4 py-10 sm:px-8">
        <section className="w-full max-w-md" aria-labelledby="login-title">
          <div className="space-y-6 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-foreground/10 sm:p-8">
            <div className="space-y-1.5">
              <h1 id="login-title" className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
              <p className="text-sm text-muted-foreground">Ingrese sus credenciales y seleccione la sucursal.</p>
            </div>

            {message && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>{error ? 'Revise los datos' : 'Sesión no disponible'}</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <AlertDialog open={authError !== null} onOpenChange={(open) => { if (!open) setAuthError(null) }}>
              <AlertDialogContent size="sm" finalFocus={passwordRef}>
                <AlertDialogHeader>
                  <AlertDialogMedia className="bg-destructive/10 text-destructive"><ShieldAlertIcon /></AlertDialogMedia>
                  <AlertDialogTitle>{invalidCredentials ? 'Credenciales inválidas' : 'No fue posible iniciar sesión'}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {invalidCredentials
                      ? 'El usuario o la contraseña no son correctos, o el usuario no tiene acceso a la sucursal seleccionada. Verifique los datos e intente de nuevo.'
                      : authError}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel variant="default" className="col-span-2 w-full">Intentar de nuevo</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <form noValidate onSubmit={event => void submit(event)} aria-busy={submitting}>
              <fieldset disabled={submitting} className="space-y-5">
                <div className="grid gap-2">
                  <Label htmlFor="userName">Usuario</Label>
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input id="userName" name="userName" autoComplete="username" maxLength={50} required autoFocus placeholder="Nombre de usuario" className="h-10 pl-9" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <LockIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input ref={passwordRef} id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" maxLength={255} required placeholder="Contraseña" className="h-10 pr-10 pl-9" />
                    <Button type="button" variant="ghost" size="icon-sm" className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </Button>
                  </div>
                </div>
                <fieldset className="grid gap-2">
                  <legend className="mb-2 text-sm leading-none font-medium">Sucursal</legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {branches.map((branch, index) => {
                      const { icon: Icon, description } = branchInfo[branch.value]
                      return (
                        <label key={branch.value} className="group relative flex cursor-pointer items-center gap-3 rounded-xl border bg-background p-3 transition-colors hover:bg-muted/60 has-checked:border-foreground has-checked:bg-muted/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-disabled:cursor-not-allowed has-disabled:opacity-60 sm:flex-col sm:items-start sm:gap-2">
                          <input type="radio" name="node" value={branch.value} required={index === 0} className="peer sr-only" />
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors peer-checked:bg-foreground peer-checked:text-background" aria-hidden="true"><Icon className="size-4" /></span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{branch.label}</span>
                            <span className="block text-xs text-muted-foreground">{description}</span>
                          </span>
                          <CheckCircle2Icon className="ml-auto size-4 shrink-0 text-foreground opacity-0 transition-opacity peer-checked:opacity-100 sm:absolute sm:top-3 sm:right-3" aria-hidden="true" />
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
                <Button type="submit" size="lg" className="h-10 w-full">
                  {submitting ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <LogInIcon data-icon="inline-start" />}
                  {submitting ? 'Ingresando...' : 'Iniciar sesión'}
                </Button>
              </fieldset>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}

/** Icono y alcance de cada sucursal para orientar la selección. */
const branchInfo: Record<Node, { icon: LucideIcon; description: string }> = {
  'san-jose': { icon: Building2Icon, description: 'Administración' },
  limon: { icon: Building2Icon, description: 'Administración' },
  corporativo: { icon: ChartNoAxesCombinedIcon, description: 'Reportes' },
}
