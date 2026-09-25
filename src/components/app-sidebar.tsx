import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Activity, ChevronsUpDown, CircleUserRound, FolderTree, LayoutDashboard, KeyRound, LogOut, Monitor, Moon, Package, Shield, Sun, SunMoon, Truck, UserRound, Users } from 'lucide-react'
import { request, type Principal } from '@/api/auth'
import { AccountDialog } from '@/components/account-dialog'
import { useTheme } from '@/components/theme-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'

export function AppSidebar({ principal }: { principal: Principal }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const [accountOpen, setAccountOpen] = useState(false)
  const queryClient = useQueryClient()
  const logout = useMutation({
    mutationFn: () => request('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.clear()
      window.location.assign('/api/auth/entra-logout')
    },
  })
  const canReadCategories = principal.permissions.includes('categories.read')
  const canReadProducts = principal.permissions.includes('products.read')
  const canReadSuppliers = principal.permissions.includes('suppliers.read')
  const canReadUsers = principal.permissions.includes('users.read')
  const canOpenRoles = principal.permissions.includes('roles.read') || principal.permissions.includes('roles.create')
  const canReadPermissions = principal.permissions.includes('permissions.read')
  const displayName = principal.full_name?.trim() || principal.email || 'Usuario'
  const displayEmail = principal.email || 'Correo no disponible'

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/" />} size="lg" tooltip="Tuercavo">
              <img src="/favicon.svg" alt="" className="size-8 shrink-0" />
              <span className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">Tuercavo</span>
                <span className="truncate text-xs">Empresa</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/" />} isActive={pathname === '/'} tooltip="Dashboard">
                  <LayoutDashboard /> <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {canReadCategories && <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/categories" />} isActive={pathname === '/categories'} tooltip="Categorías">
                  <FolderTree /> <span>Categorías</span>
                </SidebarMenuButton>
              </SidebarMenuItem>}
              {canReadProducts && <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/products" />} isActive={pathname === '/products'} tooltip="Productos">
                  <Package /> <span>Productos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>}
              {canReadSuppliers && <SidebarMenuItem><SidebarMenuButton render={<Link to="/suppliers" />} isActive={pathname === '/suppliers'} tooltip="Proveedores"><Truck /> <span>Proveedores</span></SidebarMenuButton></SidebarMenuItem>}
              {canReadUsers && <SidebarMenuItem><SidebarMenuButton render={<Link to="/users" />} isActive={pathname === '/users'} tooltip="Usuarios"><Users /> <span>Usuarios</span></SidebarMenuButton></SidebarMenuItem>}
              {canOpenRoles && <SidebarMenuItem><SidebarMenuButton render={<Link to="/roles" />} isActive={pathname === '/roles'} tooltip="Roles"><Shield /> <span>Roles</span></SidebarMenuButton></SidebarMenuItem>}
              {canReadPermissions && <SidebarMenuItem><SidebarMenuButton render={<Link to="/permissions" />} isActive={pathname === '/permissions'} tooltip="Permisos"><KeyRound /> <span>Permisos</span></SidebarMenuButton></SidebarMenuItem>}
              <SidebarMenuItem><SidebarMenuButton render={<Link to="/health" />} isActive={pathname === '/health'} tooltip="Estado de la API"><Activity /> <span>Estado de la API</span></SidebarMenuButton></SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton title="Tema" />}>
                <SunMoon /> <span>Tema</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent side={isMobile ? 'top' : 'right'} align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Apariencia</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={theme} onValueChange={(value) => {
                    if (value === 'light' || value === 'dark' || value === 'system') setTheme(value)
                  }}>
                    <DropdownMenuRadioItem value="light" closeOnClick><Sun /> Claro</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark" closeOnClick><Moon /> Oscuro</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system" closeOnClick><Monitor /> Sistema</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" title={`${displayName} · ${displayEmail}`} />}>
                <UserRound />
                <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>
                </span>
                <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side={isMobile ? 'top' : 'right'} align="end" className="min-w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <UserRound aria-hidden="true" />
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate">{displayName}</span>
                      <span className="truncate font-normal">{displayEmail}</span>
                    </span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setAccountOpen(true)}><CircleUserRound /> Cuenta</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => logout.mutate()} disabled={logout.isPending}>
                    <LogOut /> {logout.isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        {logout.isError && <p role="alert">No se pudo cerrar la sesión.</p>}
        {accountOpen && <AccountDialog principal={principal} onClose={() => setAccountOpen(false)} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
