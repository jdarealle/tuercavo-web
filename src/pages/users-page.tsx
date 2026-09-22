import { useState, type FormEvent } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import { Ellipsis, Plus } from 'lucide-react'
import { type Principal } from '@/api/auth'
import { fieldErrors } from '@/api/catalog'
import { createUserSchema, roles, roleCodeSchema, updateUserSchema, users, type CreateUser, type RoleCode, type UpdateUser, type User } from '@/api/users'
import { ErrorMessage, HelpLabel, PageNavigation } from '@/components/catalog-ui'
import { formatDate } from '@/components/catalog-format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldError, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const fallbackRoles = [
  { code: 'admin', name: 'Administrador' },
  { code: 'capturista', name: 'Capturista' },
  { code: 'consultor', name: 'Consultor' },
] satisfies { code: RoleCode; name: string }[]

function UserEditor({ principal, user, onClose }: { principal: Principal; user?: User; onClose: () => void }) {
  const queryClient = useQueryClient()
  const canReadRoles = principal.permissions.includes('roles.read')
  const availableRoles = useQuery({ queryKey: ['roles'], queryFn: roles.list, enabled: !user && canReadRoles, staleTime: 300_000 })
  const roleOptions = (availableRoles.data ?? fallbackRoles).filter((item) => v.safeParse(roleCodeSchema, item.code).success).map((item) => ({ label: item.name, value: item.code }))
  const [role, setRole] = useState<RoleCode>('consultor')
  const [active, setActive] = useState(user?.is_active ? 'active' : 'inactive')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const mutation = useMutation({
    mutationFn: (input: CreateUser | UpdateUser) => {
      if (!user) return users.create(input as CreateUser)
      const changes: Partial<UpdateUser> = {}
      const update = input as UpdateUser
      if (update.email !== user.email) changes.email = update.email
      if (update.full_name !== user.full_name) changes.full_name = update.full_name
      if (update.is_active !== user.is_active) changes.is_active = update.is_active
      return users.update(user.public_id, changes)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      if (user?.public_id === principal.public_id) void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      onClose()
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const raw = user
      ? { email: String(data.get('email') ?? ''), full_name: String(data.get('full_name') ?? ''), is_active: active === 'active' }
      : { entra_tenant_id: principal.tenant_id, entra_object_id: String(data.get('entra_object_id') ?? ''), email: String(data.get('email') ?? ''), full_name: String(data.get('full_name') ?? ''), role }
    const result = user ? v.safeParse(updateUserSchema, raw) : v.safeParse(createUserSchema, raw)
    if (!result.success) { setErrors(fieldErrors(result.issues)); return }
    setErrors({})
    if (user && 'is_active' in result.output && result.output.email === user.email && result.output.full_name === user.full_name && result.output.is_active === user.is_active) { onClose(); return }
    mutation.mutate(result.output)
  }
  const clearError = (field: string) => { setErrors((current) => ({ ...current, [field]: '' })); if (mutation.isError) mutation.reset() }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent>
      <DialogHeader><DialogTitle>{user ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle><DialogDescription>{user ? 'Actualiza los datos o el acceso del usuario.' : 'Registra una identidad de Entra del tenant actual.'}</DialogDescription></DialogHeader>
      <form onSubmit={submit} noValidate className="grid gap-4"><FieldGroup>
        {!user && <Field data-invalid={!!errors.entra_object_id}>
          <HelpLabel htmlFor="user-object-id" label="ID de objeto de Entra" required help="UUID de la identidad del usuario en Microsoft Entra. Debe pertenecer al tenant configurado en la API." />
          <Input id="user-object-id" name="entra_object_id" required aria-invalid={!!errors.entra_object_id} onChange={() => clearError('entra_object_id')} />
          {errors.entra_object_id && <FieldError>{errors.entra_object_id}</FieldError>}
        </Field>}
        <Field data-invalid={!!errors.email}>
          <HelpLabel htmlFor="user-email" label="Correo" required help="Correo de la identidad de Entra, hasta 254 caracteres y sin espacios." />
          <Input id="user-email" name="email" type="email" defaultValue={user?.email ?? ''} required maxLength={254} aria-invalid={!!errors.email} onChange={() => clearError('email')} />
          {errors.email && <FieldError>{errors.email}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.full_name}>
          <HelpLabel htmlFor="user-name" label="Nombre completo" required help="Nombre visible, de 1 a 150 caracteres." />
          <Input id="user-name" name="full_name" defaultValue={user?.full_name ?? ''} required maxLength={150} aria-invalid={!!errors.full_name} onChange={() => clearError('full_name')} />
          {errors.full_name && <FieldError>{errors.full_name}</FieldError>}
        </Field>
        {!user && <Field>
          <HelpLabel htmlFor="user-role" label="Rol" required help="Define los permisos iniciales. El cambio de rol posterior se hace por separado." />
          <Select items={roleOptions} value={role} onValueChange={(value) => { if (v.safeParse(roleCodeSchema, value).success) setRole(value as RoleCode) }}><SelectTrigger id="user-role"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{roleOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent></Select>
        </Field>}
        {user && <Field>
          <HelpLabel htmlFor="user-active" label="Acceso" help="Desactivar al usuario revoca sus sesiones activas. La API impide desactivar al último administrador activo." />
          <Select items={[{ label: 'Activo', value: 'active' }, { label: 'Inactivo', value: 'inactive' }]} value={active} onValueChange={(value) => { if (value) setActive(value) }}><SelectTrigger id="user-active"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="active">Activo</SelectItem><SelectItem value="inactive">Inactivo</SelectItem></SelectGroup></SelectContent></Select>
        </Field>}
      </FieldGroup>
      {availableRoles.isError && <ErrorMessage error={availableRoles.error} />}
      {mutation.isError && <ErrorMessage error={mutation.error} />}
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : 'Guardar'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

function RoleEditor({ user, selfId, canReadRoles, onClose }: { user: User; selfId: string; canReadRoles: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const availableRoles = useQuery({ queryKey: ['roles'], queryFn: roles.list, enabled: canReadRoles, staleTime: 300_000 })
  const roleOptions = (availableRoles.data ?? fallbackRoles).filter((item) => v.safeParse(roleCodeSchema, item.code).success).map((item) => ({ label: item.name, value: item.code }))
  const [role, setRole] = useState<RoleCode>(v.safeParse(roleCodeSchema, user.role).success ? user.role as RoleCode : 'consultor')
  const mutation = useMutation({ mutationFn: () => users.assignRole(user.public_id, role), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['users'] }); if (user.public_id === selfId) void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }); onClose() } })
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}><DialogContent><DialogHeader><DialogTitle>Cambiar rol</DialogTitle><DialogDescription>{user.full_name}. La API impide degradar al último administrador activo.</DialogDescription></DialogHeader><Field><HelpLabel htmlFor="assign-role" label="Rol" required help="El rol elegido determina los permisos del usuario en la próxima petición." /><Select items={roleOptions} value={role} onValueChange={(value) => { if (v.safeParse(roleCodeSchema, value).success) setRole(value as RoleCode) }}><SelectTrigger id="assign-role"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{roleOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>{availableRoles.isError && <ErrorMessage error={availableRoles.error} />}{mutation.isError && <ErrorMessage error={mutation.error} />}<DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => mutation.mutate()} disabled={mutation.isPending || role === user.role}>{mutation.isPending ? 'Guardando…' : 'Guardar rol'}</Button></DialogFooter></DialogContent></Dialog>
}

function UserDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const detail = useQuery({ queryKey: ['users', 'detail', id], queryFn: () => users.get(id) })
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}><DialogContent><DialogHeader><DialogTitle>Detalle de usuario</DialogTitle><DialogDescription>Identidad y acceso registrados en la API.</DialogDescription></DialogHeader>{detail.isPending && <p>Cargando usuario…</p>}{detail.isError && <ErrorMessage error={detail.error} />}{detail.data && <Table><TableBody>
    <TableRow><TableHead scope="row">Nombre</TableHead><TableCell>{detail.data.full_name}</TableCell></TableRow>
    <TableRow><TableHead scope="row">Correo</TableHead><TableCell>{detail.data.email}</TableCell></TableRow>
    <TableRow><TableHead scope="row">Rol</TableHead><TableCell>{detail.data.role}</TableCell></TableRow>
    <TableRow><TableHead scope="row">Acceso</TableHead><TableCell><Badge>{detail.data.is_active ? 'Activo' : 'Inactivo'}</Badge></TableCell></TableRow>
    <TableRow><TableHead scope="row">ID de objeto de Entra</TableHead><TableCell>{detail.data.entra_object_id}</TableCell></TableRow>
    <TableRow><TableHead scope="row">ID del tenant de Entra</TableHead><TableCell>{detail.data.entra_tenant_id}</TableCell></TableRow>
    <TableRow><TableHead scope="row">Identificador</TableHead><TableCell>{detail.data.public_id}</TableCell></TableRow>
    <TableRow><TableHead scope="row">Creado</TableHead><TableCell>{formatDate(detail.data.created_at)}</TableCell></TableRow>
    <TableRow><TableHead scope="row">Actualizado</TableHead><TableCell>{formatDate(detail.data.updated_at)}</TableCell></TableRow>
  </TableBody></Table>}<DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter></DialogContent></Dialog>
}

export function UsersPage({ principal }: { principal: Principal }) {
  const canRead = principal.permissions.includes('users.read')
  const canCreate = principal.permissions.includes('users.create') && principal.permissions.includes('users.assign_role')
  const canUpdate = principal.permissions.includes('users.update')
  const canAssign = principal.permissions.includes('users.assign_role')
  const [page, setPage] = useState(1)
  const [editor, setEditor] = useState<{ user?: User } | null>(null)
  const [roleUser, setRoleUser] = useState<User | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const list = useQuery({ queryKey: ['users', 'list', page], queryFn: () => users.list(page), enabled: canRead, placeholderData: keepPreviousData })
  if (!canRead) return <p>No tienes permiso para consultar usuarios.</p>
  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Usuarios</h1><p className="text-sm text-muted-foreground">Administra el acceso de las identidades de Entra del tenant actual.</p></div>{canCreate && <Button onClick={() => setEditor({})}><Plus /> Nuevo usuario</Button>}</div>
    {list.isError && <ErrorMessage error={list.error} />}
    <Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Correo</TableHead><TableHead>Rol</TableHead><TableHead>Acceso</TableHead><TableHead>Actualizado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>
      {list.isPending && <TableRow><TableCell colSpan={6}>Cargando usuarios…</TableCell></TableRow>}
      {list.isSuccess && !list.data.data.length && <TableRow><TableCell colSpan={6}>No hay usuarios para mostrar.</TableCell></TableRow>}
      {list.data?.data.map((user) => <TableRow key={user.public_id}><TableCell>{user.full_name}</TableCell><TableCell>{user.email}</TableCell><TableCell>{user.role}</TableCell><TableCell><Badge>{user.is_active ? 'Activo' : 'Inactivo'}</Badge></TableCell><TableCell>{formatDate(user.updated_at)}</TableCell><TableCell><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${user.full_name}`} />}><Ellipsis /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setViewId(user.public_id)}>Ver detalle</DropdownMenuItem>{canUpdate && <DropdownMenuItem onClick={() => setEditor({ user })}>Editar acceso y datos</DropdownMenuItem>}{canAssign && <DropdownMenuItem onClick={() => setRoleUser(user)}>Cambiar rol</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}
    </TableBody></Table>
    {list.isSuccess && <PageNavigation page={list.data.page} totalPages={list.data.total_pages} total={list.data.total} onPageChange={setPage} />}
    {editor && <UserEditor key={editor.user?.public_id ?? 'new'} principal={principal} user={editor.user} onClose={() => setEditor(null)} />}
    {roleUser && <RoleEditor key={roleUser.public_id} user={roleUser} selfId={principal.public_id} canReadRoles={principal.permissions.includes('roles.read')} onClose={() => setRoleUser(null)} />}
    {viewId && <UserDetails id={viewId} onClose={() => setViewId(null)} />}
  </div>
}
