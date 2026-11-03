'use client'

import { createContext, Fragment, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { clearSession, homeForRole, readSession, requiredPageRole, saveSession, sessionFromLogin, sessionInfo, SESSION_EXPIRED_MESSAGE } from '@/lib/helpers/session'
import type { LoginResponse, Node, SessionInfo, StoredSession } from '@/lib/types/auth'

interface SessionState {
  session: SessionInfo | null
  checkedPath: string | null
  error: string | null
  revision: number
}

interface SessionContextValue {
  session: SessionInfo | null
  checking: boolean
  error: string | null
  revision: number
  isSessionCurrent: (revision: number) => boolean
  invalidateSession: (revision: number) => void
  startSession: (result: LoginResponse, node: Node) => void
  logout: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

/**
 * Comparte los metadatos y las acciones de sesión entre login, navegación y páginas.
 * El JWT permanece fuera del contexto de presentación.
 *
 * @param children Contenido de la aplicación que utiliza la sesión.
 * @returns Proveedor del estado de sesión de la pestaña actual.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [state, setState] = useState<SessionState>({ session: null, checkedPath: null, error: null, revision: 0 })
  const activeToken = useRef<string | null>(null)
  const activeRevision = useRef(0)
  const currentPath = useRef(pathname)
  const preventRestore = useRef(false)
  const pageMask = useRef<{ visibility: string; opacity: string; inert: boolean } | null>(null)

  /** Permite que una respuesta de otra pantalla compruebe la ruta ya vigente. */
  useLayoutEffect(() => { currentPath.current = pathname }, [pathname])

  /** Restaura la presentación previa de toda la página, incluidos sus portales. */
  const revealPage = useCallback(() => {
    const previous = pageMask.current
    if (!previous) return
    document.body.style.visibility = previous.visibility
    document.body.style.opacity = previous.opacity
    document.body.inert = previous.inert
    pageMask.current = null
  }, [])

  /**
   * Actualiza los metadatos y reinicia el contenido solo si cambia el contexto.
   *
   * @param next Sesión recuperada o null cuando termina la sesión.
   * @param message Mensaje que debe mostrarse en login, si corresponde.
   * @param restart Indica si se inicia o termina expresamente un contexto.
   */
  const commit = useCallback((next: StoredSession | null, message?: string | null, restart = false) => {
    const changed = restart || activeToken.current !== (next?.token ?? null)
    const revision = activeRevision.current + (changed ? 1 : 0)
    activeToken.current = next?.token ?? null
    activeRevision.current = revision
    if (changed) toast.close()
    setState(previous => ({
      session: next ? sessionInfo(next) : null,
      checkedPath: currentPath.current,
      error: message === undefined ? next ? null : previous.error : message,
      revision,
    }))
  }, [])

  /**
   * Confirma sincrónicamente que almacenamiento, token privado y revisión siguen vigentes.
   * Si la entrada local cambió, sincroniza el contexto y rechaza la carga anterior.
   *
   * @param revision Revisión que inició una lectura.
   * @returns Verdadero únicamente si esa misma sesión continúa activa.
   */
  const isSessionCurrent = useCallback((revision: number): boolean => {
    if (revision !== activeRevision.current || preventRestore.current) return false
    try {
      const stored = readSession()
      if (!stored) {
        if (activeToken.current !== null) commit(null, SESSION_EXPIRED_MESSAGE)
        return false
      }
      if (stored.token !== activeToken.current) {
        commit(stored)
        return false
      }
      return true
    } catch (reason) {
      commit(null, reason instanceof Error ? reason.message : 'No fue posible recuperar la sesión.')
      return false
    }
  }, [commit])

  /**
   * Recupera la sesión local y comunica errores sin restaurar un borrado fallido.
   */
  const restoreSession = useCallback(() => {
    if (preventRestore.current) {
      commit(null)
      return
    }
    try {
      const stored = readSession()
      const ended = !stored && activeToken.current !== null
      commit(stored, ended ? SESSION_EXPIRED_MESSAGE : undefined)
    } catch (reason) {
      commit(null, reason instanceof Error ? reason.message : 'No fue posible recuperar la sesión.')
    }
  }, [commit])

  /**
   * Valida y guarda el resultado del login antes de activar la sesión compartida.
   *
   * @param result Respuesta del login existente de la API.
   * @param node Sucursal seleccionada en el formulario.
   */
  const startSession = useCallback((result: LoginResponse, node: Node) => {
    const next = sessionFromLogin(result, node)
    saveSession(next)
    preventRestore.current = false
    commit(next, null, true)
  }, [commit])

  /**
   * Cierra la sesión de la pestaña y retira sus datos aunque falle el borrado local.
   */
  const logout = useCallback(() => {
    let message: string | null = null
    try { clearSession() } catch (reason) {
      preventRestore.current = true
      message = reason instanceof Error ? reason.message : 'No fue posible eliminar la sesión del almacenamiento.'
    }
    commit(null, message, true)
  }, [commit])

  /**
   * Invalida la sesión por un 401 solo si aún corresponde a la revisión solicitante.
   *
   * @param revision Revisión de sesión que recibió la respuesta 401.
   */
  const invalidateSession = useCallback((revision: number) => {
    if (!isSessionCurrent(revision)) return
    try {
      clearSession()
      commit(null, SESSION_EXPIRED_MESSAGE, true)
    } catch (reason) {
      preventRestore.current = true
      commit(null, reason instanceof Error ? reason.message : 'No fue posible eliminar la sesión del almacenamiento.', true)
    }
  }, [commit, isSessionCurrent])

  useEffect(() => {
    let active = true
    /** Revisa la sesión antes de actualizar una pestaña que vuelve a ser visible. */
    function checkVisible() {
      if (document.visibilityState === 'visible') flushSync(restoreSession)
    }
    /** Oculta también los portales del historial sin desmontar los formularios. */
    function hidePage() {
      if (!pageMask.current) {
        const body = document.body
        pageMask.current = { visibility: body.style.visibility, opacity: body.style.opacity, inert: body.inert }
        body.style.visibility = 'hidden'
        body.style.opacity = '0'
        body.inert = true
      }
      toast.close()
    }
    /** Valida el contexto antes de revelar una página recuperada del historial. */
    function showPage() {
      flushSync(restoreSession)
      revealPage()
    }
    queueMicrotask(() => { if (active) restoreSession() })
    window.addEventListener('focus', checkVisible)
    window.addEventListener('pageshow', showPage)
    window.addEventListener('pagehide', hidePage)
    document.addEventListener('visibilitychange', checkVisible)
    return () => {
      active = false
      window.removeEventListener('focus', checkVisible)
      window.removeEventListener('pageshow', showPage)
      window.removeEventListener('pagehide', hidePage)
      document.removeEventListener('visibilitychange', checkVisible)
    }
  }, [pathname, restoreSession, revealPage])

  useEffect(() => () => revealPage(), [revealPage])

  useEffect(() => {
    if (!state.session) return
    const timer = setTimeout(restoreSession, Math.max(0, state.session.expiresAt - Date.now()))
    return () => clearTimeout(timer)
  }, [state.session, restoreSession])

  return (
    <SessionContext.Provider value={{ session: state.session, checking: state.checkedPath !== pathname, error: state.error, revision: state.revision, isSessionCurrent, invalidateSession, startSession, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

/**
 * Obtiene los metadatos y acciones de la sesión compartida, sin incluir el JWT.
 *
 * @returns Contexto de sesión disponible dentro del proveedor.
 */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) throw new Error('La sesión debe utilizarse dentro de SessionProvider.')
  return context
}

/**
 * Impide montar las páginas cliente hasta comprobar su sesión y el rol requerido.
 * La autorización definitiva de los datos corresponde a la API.
 *
 * @param children Página solicitada por el navegador.
 * @returns Página permitida, estado de espera o aviso de acceso denegado.
 */
export function SessionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { session, checking, revision } = useSession()
  const requiredRole = requiredPageRole(pathname)
  let destination: string | null = null
  if (!checking) {
    if (pathname === '/login' && session) destination = homeForRole(session.rol)
    else if (requiredRole && !session) destination = '/login'
    else if (pathname === '/' && session?.rol === 'Corporativo') destination = '/reports'
  }

  useEffect(() => {
    if (destination) router.replace(destination)
  }, [destination, router])

  if (checking || destination) {
    return <p role="status" className="p-6 text-center text-sm text-muted-foreground">{checking ? 'Comprobando sesión...' : 'Redirigiendo...'}</p>
  }
  if (requiredRole && session && session.rol !== requiredRole) {
    return (
      <main lang="es" className="flex min-w-0 flex-1 items-center justify-center bg-muted/30 p-6">
        <section className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Sin permisos</h1>
          <p role="alert" className="text-sm text-muted-foreground">Su rol no permite consultar esta página.</p>
          <Button nativeButton={false} render={<Link href={homeForRole(session.rol)} />}>Volver al inicio permitido</Button>
        </section>
      </main>
    )
  }
  return <Fragment key={revision}>{children}</Fragment>
}
