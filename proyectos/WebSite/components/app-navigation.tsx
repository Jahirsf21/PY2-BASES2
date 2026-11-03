'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChartNoAxesCombinedIcon, ChevronDownIcon, GlobeIcon, LogOutIcon, MapPinIcon, PackageIcon, ShieldIcon, ShoppingCartIcon, TruckIcon, UsersRoundIcon } from 'lucide-react'
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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

  const initials = session.userName.replace(/[^\p{L}\p{N}\s_.-]/gu, '').split(/[\s_.-]+/).filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase()).join('') || '?'

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-card/95 px-4 backdrop-blur supports-backdrop-filter:bg-card/80 sm:px-8">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3">
          <Link href={visibleLinks[0]?.href ?? '/'} className="flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="World Wide Importers, inicio">
            <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background" aria-hidden="true"><GlobeIcon className="size-4" /></span>
            <span className="hidden text-sm font-semibold sm:inline">World Wide Importers</span>
          </Link>
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
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Sesión de ${session.userName} en ${branch}. Abrir menú de sesión`}
              className="flex min-w-0 items-center gap-2.5 rounded-full py-1 pr-2 pl-1 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-muted"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold ring-1 ring-foreground/10" aria-hidden="true">{initials}</span>
              <span className="min-w-0 leading-tight">
                <span className="block max-w-36 truncate text-sm font-medium">{session.userName}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPinIcon className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{branch}</span></span>
              </span>
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="space-y-0.5 py-2">
                  <span className="block truncate text-sm font-medium text-foreground">{session.userName}</span>
                  <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground"><ShieldIcon className="size-3" aria-hidden="true" />{session.rol}</span>
                  <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground"><MapPinIcon className="size-3" aria-hidden="true" />Sucursal {branch}</span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={closeSession}><LogOutIcon />Cerrar sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
