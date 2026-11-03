'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChartNoAxesCombinedIcon, LogOutIcon, PackageIcon, ShoppingCartIcon, TruckIcon, UsersRoundIcon } from 'lucide-react'
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu'
import { Button } from '@/components/ui/button'
import { useSession } from '@/components/auth-session'
import { branches, requiredPageRole } from '@/lib/helpers/session'

const links = [
  { href: '/', label: 'Clientes', icon: UsersRoundIcon },
  { href: '/suppliers', label: 'Proveedores', icon: TruckIcon },
  { href: '/inventory', label: 'Inventario', icon: PackageIcon },
  { href: '/sales', label: 'Ventas', icon: ShoppingCartIcon },
  { href: '/reports', label: 'Reportes', icon: ChartNoAxesCombinedIcon },
]

/**
 * Muestra los módulos permitidos y los controles de la sesión de esta pestaña.
 *
 * @returns Encabezado y navegación responsive, u omite ambos si no hay sesión lista.
 */
export function AppNavigation() {
  const pathname = usePathname()
  const { session, checking, logout } = useSession()
  if (checking || !session || pathname === '/login') return null
  const visibleLinks = links.filter(link => requiredPageRole(link.href) === session.rol)
  const branch = branches.find(branch => branch.value === session.node)?.label ?? session.node

  /**
   * Comprueba si el enlace corresponde al módulo de la página actual.
   *
   * @param href Ruta principal del módulo.
   * @returns Verdadero si la página pertenece al enlace.
   */
  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/' || /^\/customers(?:\/|$)/.test(pathname)
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  /**
   * Advierte de la pérdida de cambios en alta o edición antes del logout manual.
   */
  function closeSession() {
    if (/\/(?:new|edit)\/?$/.test(pathname) && !window.confirm('Al cerrar sesión se perderán los cambios no guardados. ¿Desea continuar?')) return
    logout()
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-card px-4 sm:px-8">
        <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center justify-between gap-3 py-3">
          <span className="text-sm font-semibold">
            World Wide Importers
          </span>
          <NavigationMenu aria-label="Navegación principal" className="hidden max-w-none lg:flex">
            <NavigationMenuList>
              {visibleLinks.map(({ href, label, icon: Icon }) => (
                <NavigationMenuItem key={href}>
                  <NavigationMenuLink
                    render={<Link href={href} />}
                    data-active={isActive(href)}
                    aria-current={isActive(href) ? 'page' : undefined}
                  >
                    <Icon />
                    <span>{label}</span>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
          <div className="flex min-w-0 max-w-full items-center gap-3 lg:ml-auto">
            <div className="min-w-0 text-right text-xs" aria-label="Sesión actual">
              <p className="truncate font-medium" title={session.userName}>{session.userName}</p>
              <p className="truncate text-muted-foreground" title={`${session.rol} · ${branch}`}>{session.rol} · {branch}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={closeSession}><LogOutIcon data-icon="inline-start" />Cerrar sesión</Button>
          </div>
        </div>
      </header>

      <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-50 border-t bg-card pb-[env(safe-area-inset-bottom)] shadow-sm lg:hidden">
        <ul className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1">
          {visibleLinks.map(({ href, label, icon: Icon }) => (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={isActive(href) ? 'page' : undefined}
                className="flex h-full flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] leading-tight text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="text-center">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
