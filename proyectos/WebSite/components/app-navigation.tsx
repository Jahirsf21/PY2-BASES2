'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChartNoAxesCombinedIcon, PackageIcon, ShoppingCartIcon, TruckIcon, UsersRoundIcon } from 'lucide-react'
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu'

const links = [
  { href: '/', label: 'Clientes', icon: UsersRoundIcon },
  { href: '/suppliers', label: 'Proveedores', icon: TruckIcon },
  { href: '/inventory', label: 'Inventario', icon: PackageIcon },
  { href: '/sales', label: 'Ventas', icon: ShoppingCartIcon },
  { href: '/reports', label: 'Reportes', icon: ChartNoAxesCombinedIcon },
]

export function AppNavigation() {
  const pathname = usePathname()

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-card px-4 sm:px-8">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-center lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <span className="text-sm font-semibold">
            World Wide Importers
          </span>
          <NavigationMenu className="hidden max-w-none lg:flex">
            <NavigationMenuList>
              {links.map(({ href, label, icon: Icon }) => (
                <NavigationMenuItem key={href}>
                  <NavigationMenuLink
                    render={<Link href={href} />}
                    data-active={pathname === href}
                    aria-current={pathname === href ? 'page' : undefined}
                  >
                    <Icon />
                    <span>{label}</span>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </header>

      <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-50 border-t bg-card pb-[env(safe-area-inset-bottom)] shadow-sm lg:hidden">
        <ul className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={pathname === href ? 'page' : undefined}
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
