import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ellipsis } from 'lucide-react'
import { ApiError, type Principal } from '@/api/auth'
import { users, type User } from '@/api/users'
import { ErrorMessage, PageNavigation } from '@/components/catalog-ui'
import { formatDate } from '@/components/catalog-format'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function userLabel(user: User): string {
  return user.full_name ?? user.email ?? `Usuario ${user.entra_object_id.slice(0, 8)}`
}

function UserDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const detail = useQuery({ queryKey: ['users', 'detail', id], queryFn: () => users.get(id) })
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Detalle de usuario</DialogTitle><DialogDescription>Identidad, rol de Entra y acceso local registrados en la API.</DialogDescription></DialogHeader>
      {detail.isPending && <p>Cargando usuario…</p>}
      {detail.isError && <ErrorMessage error={detail.error} />}
      {detail.data && <Table><TableBody>
        <TableRow><TableHead scope="row">Nombre</TableHead><TableCell>{detail.data.full_name ?? '—'}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Correo</TableHead><TableCell>{detail.data.email ?? '—'}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Rol</TableHead><TableCell>{detail.data.role}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Acceso local</TableHead><TableCell><Badge variant={detail.data.is_active ? 'default' : 'secondary'}>{detail.data.is_active ? 'Activo' : 'Inactivo'}</Badge></TableCell></TableRow>
        <TableRow><TableHead scope="row">ID de objeto de Entra</TableHead><TableCell>{detail.data.entra_object_id}</TableCell></TableRow>
        <TableRow><TableHead scope="row">ID del tenant de Entra</TableHead><TableCell>{detail.data.entra_tenant_id}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Identificador</TableHead><TableCell>{detail.data.public_id}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Creado</TableHead><TableCell>{formatDate(detail.data.created_at)}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Actualizado</TableHead><TableCell>{formatDate(detail.data.updated_at)}</TableCell></TableRow>
      </TableBody></Table>}
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

export function UsersPage({ principal }: { principal: Principal }) {
  const canRead = principal.permissions.includes('users.read')
  const canUpdate = principal.permissions.includes('users.update')
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [viewId, setViewId] = useState<string | null>(null)
  const [accessUser, setAccessUser] = useState<User | null>(null)
  const list = useQuery({ queryKey: ['users', 'list', page], queryFn: () => users.list(page), enabled: canRead, placeholderData: keepPreviousData })
  const access = useMutation({
    mutationFn: (user: User) => users.update(user.public_id, { is_active: !user.is_active }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      if (updated.public_id === principal.public_id) void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      setAccessUser(null)
    },
  })

  if (!canRead) return <p>No tienes permiso para consultar usuarios.</p>

  const isDeactivation = accessUser?.is_active === true
  const conflict = access.error instanceof ApiError && access.error.status === 409

  return <div className="flex flex-col gap-6">
    <div>
      <h1 className="text-2xl font-semibold">Usuarios</h1>
      <p className="text-sm text-muted-foreground">Los usuarios aparecen después de su primer login. Las altas y los roles se administran en Microsoft Entra; aquí solo se controla su acceso local.</p>
    </div>
    {list.isError && <ErrorMessage error={list.error} />}
    <Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Correo</TableHead><TableHead>Rol de Entra</TableHead><TableHead>Acceso local</TableHead><TableHead>Actualizado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>
      {list.isPending && <TableRow><TableCell colSpan={6}>Cargando usuarios…</TableCell></TableRow>}
      {list.isSuccess && !list.data.data.length && <TableRow><TableCell colSpan={6}>Ningún usuario ha iniciado sesión todavía.</TableCell></TableRow>}
      {list.data?.data.map((user) => {
        const label = userLabel(user)
        return <TableRow key={user.public_id}>
          <TableCell>{user.full_name ?? '—'}</TableCell>
          <TableCell>{user.email ?? '—'}</TableCell>
          <TableCell>{user.role}</TableCell>
          <TableCell><Badge variant={user.is_active ? 'default' : 'secondary'}>{user.is_active ? 'Activo' : 'Inactivo'}</Badge></TableCell>
          <TableCell>{formatDate(user.updated_at)}</TableCell>
          <TableCell><DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${label}`} />}><Ellipsis /></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setViewId(user.public_id)}>Ver detalle</DropdownMenuItem>
              {canUpdate && <DropdownMenuItem variant={user.is_active ? 'destructive' : 'default'} onClick={() => { access.reset(); setAccessUser(user) }}>{user.is_active ? 'Desactivar acceso' : 'Activar acceso'}</DropdownMenuItem>}
            </DropdownMenuGroup></DropdownMenuContent>
          </DropdownMenu></TableCell>
        </TableRow>
      })}
    </TableBody></Table>
    {list.isSuccess && <PageNavigation page={list.data.page} totalPages={list.data.total_pages} total={list.data.total} onPageChange={setPage} />}
    {viewId && <UserDetails id={viewId} onClose={() => setViewId(null)} />}
    <AlertDialog open={!!accessUser} onOpenChange={(open) => { if (!open && !access.isPending) { setAccessUser(null); access.reset() } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isDeactivation ? 'Desactivar acceso local' : 'Activar acceso local'}</AlertDialogTitle>
          <AlertDialogDescription>{isDeactivation
            ? `Se revocarán las sesiones locales de ${accessUser ? userLabel(accessUser) : 'este usuario'}. La asignación del rol en Entra no se modifica.`
            : `${accessUser ? userLabel(accessUser) : 'Este usuario'} podrá volver a iniciar sesión con el rol que tenga asignado en Entra.`}</AlertDialogDescription>
        </AlertDialogHeader>
        {access.isError && (conflict
          ? <p role="alert" className="text-sm text-destructive">No se puede desactivar al último administrador activo.</p>
          : <ErrorMessage error={access.error} />)}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={access.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant={isDeactivation ? 'destructive' : 'default'} disabled={access.isPending} onClick={() => { if (accessUser) access.mutate(accessUser) }}>
            {access.isPending ? 'Guardando…' : isDeactivation ? 'Desactivar' : 'Activar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
}
