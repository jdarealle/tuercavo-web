import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Principal } from '@/api/auth'
import { permissions, roles, users } from '@/api/users'
import { formatDate } from '@/components/catalog-format'
import { ErrorMessage } from '@/components/catalog-ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

function AccountDetail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="break-words">{children}</dd>
  </div>
}

export function AccountDialog({ principal, onClose }: { principal: Principal; onClose: () => void }) {
  const user = useQuery({
    queryKey: ['users', 'detail', principal.public_id],
    queryFn: () => users.get(principal.public_id),
    enabled: principal.permissions.includes('users.read'),
  })
  const role = useQuery({
    queryKey: ['roles', 'detail', principal.role],
    queryFn: () => roles.get(principal.role),
    enabled: principal.permissions.includes('roles.read'),
  })
  const catalog = useQuery({
    queryKey: ['permissions'],
    queryFn: permissions.list,
    enabled: principal.permissions.includes('permissions.read'),
    staleTime: 300_000,
  })
  const permissionDescriptions = new Map(catalog.data?.map(({ code, description }) => [code, description]) ?? [])

  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent className="max-h-[calc(100dvh-2rem)] min-w-0 overflow-y-auto sm:max-w-2xl lg:max-w-4xl">
      <DialogHeader>
        <DialogTitle>Cuenta</DialogTitle>
        <DialogDescription>Información de tu usuario y acceso en Tuercavo.</DialogDescription>
      </DialogHeader>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader><CardTitle>Perfil</CardTitle><CardDescription>Datos de tu cuenta.</CardDescription></CardHeader>
          <CardContent><dl className="grid min-w-0 gap-4 sm:grid-cols-2">
            <AccountDetail label="Nombre">{principal.full_name || 'No disponible'}</AccountDetail>
            <AccountDetail label="Correo">{principal.email || 'No disponible'}</AccountDetail>
            {user.data && <>
              <AccountDetail label="Estado de cuenta"><Badge variant={user.data.is_active ? 'default' : 'secondary'}>{user.data.is_active ? 'Activo' : 'Inactivo'}</Badge></AccountDetail>
              <AccountDetail label="Creado">{formatDate(user.data.created_at)}</AccountDetail>
              <AccountDetail label="Actualizado">{formatDate(user.data.updated_at)}</AccountDetail>
            </>}
            <AccountDetail label="ID público">{principal.public_id}</AccountDetail>
          </dl></CardContent>
        </Card>
        <Card size="sm">
          <CardHeader><CardTitle>Acceso</CardTitle><CardDescription>Rol e identificadores de Entra.</CardDescription></CardHeader>
          <CardContent><dl className="grid min-w-0 gap-4 sm:grid-cols-2">
            <AccountDetail label="Rol">{role.data?.name ?? principal.role}</AccountDetail>
            {role.data && <>
              <AccountDetail label="Código del rol">{role.data.code}</AccountDetail>
              <AccountDetail label="Estado del rol"><Badge variant={role.data.is_active ? 'default' : 'secondary'}>{role.data.is_active ? 'Activo' : 'Retirado'}</Badge></AccountDetail>
              <AccountDetail label="Tipo de rol">{role.data.is_system ? 'Sistema' : 'Personalizado'}</AccountDetail>
            </>}
            <AccountDetail label="Tenant de Entra">{principal.tenant_id}</AccountDetail>
            <AccountDetail label="Object ID de Entra">{principal.object_id}</AccountDetail>
          </dl></CardContent>
        </Card>
      </div>
      <Card size="sm">
        <CardHeader><CardTitle>Permisos ({principal.permissions.length})</CardTitle><CardDescription>Operaciones autorizadas para tu rol.</CardDescription></CardHeader>
        <CardContent>
          {principal.permissions.length ? <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
            {principal.permissions.map((code) => <li key={code} className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
              <Badge variant="outline" className="max-w-full shrink-0 whitespace-normal break-all sm:max-w-[50%]">{code}</Badge>
              {catalog.isSuccess && <p className="min-w-0 break-words text-muted-foreground">{permissionDescriptions.get(code) ?? 'Sin descripción.'}</p>}
            </li>)}
          </ul> : <p className="text-muted-foreground">Sin permisos.</p>}
        </CardContent>
      </Card>
      {user.isError && <ErrorMessage error={user.error} />}
      {role.isError && <ErrorMessage error={role.error} />}
      {catalog.isError && <ErrorMessage error={catalog.error} />}
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
