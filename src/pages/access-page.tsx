import { useQuery } from '@tanstack/react-query'
import type { Principal } from '@/api/auth'
import { permissions, roles } from '@/api/users'
import { ErrorMessage } from '@/components/catalog-ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function RolesPage({ principal }: { principal: Principal }) {
  const canRead = principal.permissions.includes('roles.read')
  const list = useQuery({ queryKey: ['roles'], queryFn: roles.list, enabled: canRead, staleTime: 300_000 })
  if (!canRead) return <p>No tienes permiso para consultar roles.</p>
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Roles</h1><p className="text-sm text-muted-foreground">Roles disponibles en la API.</p></div>{list.isError && <ErrorMessage error={list.error} />}<Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nombre</TableHead></TableRow></TableHeader><TableBody>{list.isPending && <TableRow><TableCell colSpan={2}>Cargando roles…</TableCell></TableRow>}{list.isSuccess && !list.data.length && <TableRow><TableCell colSpan={2}>No hay roles para mostrar.</TableCell></TableRow>}{list.data?.map((role) => <TableRow key={role.code}><TableCell>{role.code}</TableCell><TableCell>{role.name}</TableCell></TableRow>)}</TableBody></Table></div>
}

export function PermissionsPage({ principal }: { principal: Principal }) {
  const canRead = principal.permissions.includes('permissions.read')
  const list = useQuery({ queryKey: ['permissions'], queryFn: permissions.list, enabled: canRead, staleTime: 300_000 })
  if (!canRead) return <p>No tienes permiso para consultar permisos.</p>
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Permisos</h1><p className="text-sm text-muted-foreground">Operaciones disponibles en la API.</p></div>{list.isError && <ErrorMessage error={list.error} />}<Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Descripción</TableHead></TableRow></TableHeader><TableBody>{list.isPending && <TableRow><TableCell colSpan={2}>Cargando permisos…</TableCell></TableRow>}{list.isSuccess && !list.data.length && <TableRow><TableCell colSpan={2}>No hay permisos para mostrar.</TableCell></TableRow>}{list.data?.map((permission) => <TableRow key={permission.code}><TableCell>{permission.code}</TableCell><TableCell>{permission.description}</TableCell></TableRow>)}</TableBody></Table></div>
}
