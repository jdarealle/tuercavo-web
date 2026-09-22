import { Link, useLocation } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Activity, FolderTree, House, KeyRound, LogOut, Monitor, Moon, Package, Shield, Sun, SunMoon, Truck, Users } from 'lucide-react'
import { request, type Principal } from '@/api/auth'
import { useTheme } from '@/components/theme-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
} from '@/components/ui/sidebar'

export function AppSidebar({ principal }: { principal: Principal }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const { theme, setTheme } = useTheme()
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
  const canReadRoles = principal.permissions.includes('roles.read')
  const canReadPermissions = principal.permissions.includes('permissions.read')

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/" />}>
              <Package />
              <span>Tuercavo</span>
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
                <SidebarMenuButton render={<Link to="/" />} isActive={pathname === '/'}>
                  <House /> <span>Inicio</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {canReadCategories && <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/categories" />} isActive={pathname === '/categories'}>
                  <FolderTree /> <span>Categorías</span>
                </SidebarMenuButton>
              </SidebarMenuItem>}
              {canReadProducts && <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/products" />} isActive={pathname === '/products'}>
                  <Package /> <span>Productos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>}
              {canReadSuppliers && <SidebarMenuItem><SidebarMenuButton render={<Link to="/suppliers" />} isActive={pathname === '/suppliers'}><Truck /> <span>Proveedores</span></SidebarMenuButton></SidebarMenuItem>}
              {canReadUsers && <SidebarMenuItem><SidebarMenuButton render={<Link to="/users" />} isActive={pathname === '/users'}><Users /> <span>Usuarios</span></SidebarMenuButton></SidebarMenuItem>}
              {canReadRoles && <SidebarMenuItem><SidebarMenuButton render={<Link to="/roles" />} isActive={pathname === '/roles'}><Shield /> <span>Roles</span></SidebarMenuButton></SidebarMenuItem>}
              {canReadPermissions && <SidebarMenuItem><SidebarMenuButton render={<Link to="/permissions" />} isActive={pathname === '/permissions'}><KeyRound /> <span>Permisos</span></SidebarMenuButton></SidebarMenuItem>}
              <SidebarMenuItem><SidebarMenuButton render={<Link to="/health" />} isActive={pathname === '/health'}><Activity /> <span>Estado de la API</span></SidebarMenuButton></SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton />}>
                <SunMoon /> <span>Tema</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
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
            <SidebarMenuButton onClick={() => logout.mutate()} disabled={logout.isPending}>
              <LogOut /> <span>{logout.isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {logout.isError && <p role="alert">No se pudo cerrar la sesión.</p>}
      </SidebarFooter>
    </Sidebar>
  )
}
