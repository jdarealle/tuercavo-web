import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import { Ellipsis } from 'lucide-react'
import { ApiError, type Principal } from '@/api/auth'
import { departments, myDepartmentQueryOptions } from '@/api/departments'
import { assignDepartmentSchema, assignRoleSchema, roles, users, type User } from '@/api/users'
import { ErrorMessage, HelpLabel, PageNavigation } from '@/components/catalog-ui'
import { formatDate } from '@/components/catalog-format'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldError, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function userLabel(user: User): string {
  return user.full_name ?? user.email ?? `Usuario ${user.entra_object_id.slice(0, 8)}`
}

function UserDetails({ id, principal, onClose }: { id: string; principal: Principal; onClose: () => void }) {
  const detail = useQuery({ queryKey: ['users', 'detail', id], queryFn: () => users.get(id) })
  const departmentId = detail.data?.department_public_id ?? null
  const isOwnUser = detail.data?.public_id === principal.public_id
  const canReadDepartment = principal.role === 'admin' && principal.permissions.includes('departments.read')
  const ownDepartment = useQuery({ ...myDepartmentQueryOptions(departmentId), enabled: isOwnUser && departmentId !== null })
  const assignedDepartment = useQuery({
    queryKey: ['departments', 'detail', departmentId],
    queryFn: () => departments.get(departmentId!),
    enabled: departmentId !== null && !isOwnUser && canReadDepartment,
  })
  const departmentName = departmentId === null
    ? 'Sin departamento'
    : isOwnUser
      ? ownDepartment.isPending ? 'Cargando departamento…' : ownDepartment.data?.name ?? 'No disponible'
      : canReadDepartment
        ? assignedDepartment.isPending ? 'Cargando departamento…' : assignedDepartment.data?.name ?? 'No disponible'
        : 'Nombre no disponible para este rol'
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Detalle de usuario</DialogTitle><DialogDescription>Identidad de Entra, rol local y acceso registrados en la API.</DialogDescription></DialogHeader>
      {detail.isPending && <p>Cargando usuario…</p>}
      {detail.isError && <ErrorMessage error={detail.error} />}
      {detail.data && <Table><TableBody>
        <TableRow><TableHead scope="row">Nombre</TableHead><TableCell>{detail.data.full_name ?? '—'}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Correo</TableHead><TableCell>{detail.data.email ?? '—'}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Rol</TableHead><TableCell>{detail.data.role}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Departamento</TableHead><TableCell>{departmentName}</TableCell></TableRow>
        {detail.data.department_public_id && <TableRow><TableHead scope="row">ID del departamento</TableHead><TableCell className="break-all">{detail.data.department_public_id}</TableCell></TableRow>}
        <TableRow><TableHead scope="row">Acceso local</TableHead><TableCell><Badge variant={detail.data.is_active ? 'default' : 'secondary'}>{detail.data.is_active ? 'Activo' : 'Inactivo'}</Badge></TableCell></TableRow>
        <TableRow><TableHead scope="row">ID de objeto de Entra</TableHead><TableCell>{detail.data.entra_object_id}</TableCell></TableRow>
        <TableRow><TableHead scope="row">ID del tenant de Entra</TableHead><TableCell>{detail.data.entra_tenant_id}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Identificador</TableHead><TableCell>{detail.data.public_id}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Creado</TableHead><TableCell>{formatDate(detail.data.created_at)}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Actualizado</TableHead><TableCell>{formatDate(detail.data.updated_at)}</TableCell></TableRow>
      </TableBody></Table>}
      {isOwnUser && ownDepartment.isError && <ErrorMessage error={ownDepartment.error} />}
      {!isOwnUser && assignedDepartment.isError && <ErrorMessage error={assignedDepartment.error} />}
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

function UserRoleEditor({ user, principal, onClose }: { user: User; principal: Principal; onClose: () => void }) {
  const queryClient = useQueryClient()
  const canReadRoles = principal.permissions.includes('roles.read')
  const availableRoles = useQuery({ queryKey: ['roles', 'list'], queryFn: roles.list, enabled: canReadRoles, staleTime: 300_000 })
  const [role, setRole] = useState(user.role)
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (code: string) => users.assignRole(user.public_id, code),
    onSuccess: (updated) => {
      if (updated.public_id === principal.public_id && updated.role !== user.role) {
        queryClient.clear()
        window.location.replace('/login')
        return
      }
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
  })
  const options = (availableRoles.data ?? []).filter((item) => item.is_active).map((item) => ({ label: `${item.name} (${item.code})`, value: item.code }))

  function assign() {
    const result = v.safeParse(assignRoleSchema, { role })
    if (!result.success) { setError(result.issues[0]?.message ?? 'Selecciona un rol válido.'); return }
    if (result.output.role === user.role) { onClose(); return }
    setError('')
    mutation.mutate(result.output.role)
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose() }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Asignar rol</DialogTitle><DialogDescription>Asigna un rol local activo a {userLabel(user)}. Si cambia, la API revocará sus sesiones y deberá iniciar sesión de nuevo.</DialogDescription></DialogHeader>
      <FieldGroup><Field data-invalid={!!error}>
        <HelpLabel htmlFor="user-role" label="Rol" required help="Solo se pueden asignar roles activos. El cambio se aplica en Tuercavo, no en Microsoft Entra." />
        {canReadRoles && availableRoles.isPending
          ? <p>Cargando roles…</p>
          : canReadRoles && availableRoles.isSuccess
          ? <Select items={options} value={role} onValueChange={(value) => { if (value) { setRole(value); setError('') } }}>
            <SelectTrigger id="user-role" aria-invalid={!!error} className="w-full"><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
            <SelectContent><SelectGroup>{options.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
          : <Input id="user-role" value={role} required maxLength={32} aria-invalid={!!error} onChange={(event) => { setRole(event.target.value); setError('') }} />}
        {error && <FieldError>{error}</FieldError>}
      </Field></FieldGroup>
      {availableRoles.isError && <ErrorMessage error={availableRoles.error} />}
      {mutation.isError && <ErrorMessage error={mutation.error} />}
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="button" onClick={assign} disabled={mutation.isPending || (canReadRoles && availableRoles.isPending)}>{mutation.isPending ? 'Asignando…' : 'Asignar rol'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

function UserDepartmentEditor({ user, principal, onClose }: { user: User; principal: Principal; onClose: () => void }) {
  const queryClient = useQueryClient()
  const availableDepartments = useQuery({ queryKey: ['departments', 'list'], queryFn: departments.list, staleTime: 300_000 })
  const [selected, setSelected] = useState(user.department_public_id ?? 'none')
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (departmentId: string | null) => users.assignDepartment(user.public_id, departmentId),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      if (updated.public_id === principal.public_id) {
        void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
        void queryClient.invalidateQueries({ queryKey: ['departments', 'mine'] })
      }
      onClose()
    },
  })
  const options = [
    { label: 'Sin departamento', value: 'none' },
    ...(availableDepartments.data ?? []).map((department) => ({ label: department.name, value: department.public_id })),
  ]

  function assign() {
    if (!availableDepartments.isSuccess) return
    const departmentId = selected === 'none' ? null : selected
    const result = v.safeParse(assignDepartmentSchema, { department_public_id: departmentId })
    if (!result.success) {
      setError(result.issues[0]?.message ?? 'Selecciona un departamento válido.')
      return
    }
    if (departmentId && !availableDepartments.data.some((department) => department.public_id === departmentId)) {
      setError('Selecciona un departamento válido.')
      return
    }
    if (result.output.department_public_id === user.department_public_id) { onClose(); return }
    setError('')
    mutation.mutate(result.output.department_public_id)
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose() }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Asignar departamento</DialogTitle><DialogDescription>Asigna o retira el departamento local de {userLabel(user)}. Este cambio no modifica su rol ni sus sesiones.</DialogDescription></DialogHeader>
      <FieldGroup><Field data-invalid={!!error}>
        <HelpLabel htmlFor="user-department" label="Departamento" required help="Selecciona un departamento existente o Sin departamento para retirar la asignación." />
        {availableDepartments.isPending
          ? <p>Cargando departamentos…</p>
          : availableDepartments.isSuccess && <Select items={options} value={selected} onValueChange={(value) => { if (value) { setSelected(value); setError(''); if (mutation.isError) mutation.reset() } }}>
            <SelectTrigger id="user-department" aria-invalid={!!error} className="w-full"><SelectValue placeholder="Selecciona un departamento" /></SelectTrigger>
            <SelectContent><SelectGroup>{options.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>}
        {error && <FieldError>{error}</FieldError>}
      </Field></FieldGroup>
      {availableDepartments.isError && <ErrorMessage error={availableDepartments.error} />}
      {mutation.isError && <ErrorMessage error={mutation.error} />}
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="button" onClick={assign} disabled={mutation.isPending || !availableDepartments.isSuccess}>{mutation.isPending ? 'Guardando…' : 'Guardar asignación'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

export function UsersPage({ principal }: { principal: Principal }) {
  const canRead = principal.permissions.includes('users.read')
  const canUpdate = principal.permissions.includes('users.update')
  const canAssignRole = principal.permissions.includes('users.assign_role')
  const canReadDepartments = principal.role === 'admin' && principal.permissions.includes('departments.read')
  const canAssignDepartment = canReadDepartments && principal.permissions.includes('users.assign_department')
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [viewId, setViewId] = useState<string | null>(null)
  const [accessUser, setAccessUser] = useState<User | null>(null)
  const [roleUser, setRoleUser] = useState<User | null>(null)
  const [departmentUser, setDepartmentUser] = useState<User | null>(null)
  const list = useQuery({ queryKey: ['users', 'list', page], queryFn: () => users.list(page), enabled: canRead, placeholderData: keepPreviousData })
  const departmentCatalog = useQuery({ queryKey: ['departments', 'list'], queryFn: departments.list, enabled: canRead && canReadDepartments, staleTime: 300_000 })
  const ownDepartment = useQuery(myDepartmentQueryOptions(principal.department_public_id))
  const departmentNames = new Map(departmentCatalog.data?.map((department) => [department.public_id, department.name]) ?? [])
  const access = useMutation({
    mutationFn: (user: User) => user.is_active ? users.deactivate(user.public_id) : users.reactivate(user.public_id),
    onSuccess: (updated) => {
      if (updated.public_id === principal.public_id && !updated.is_active) {
        queryClient.clear()
        window.location.replace('/login')
        return
      }
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      if (updated.public_id === principal.public_id) void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      setAccessUser(null)
    },
  })

  if (!canRead) return <p>No tienes permiso para consultar usuarios.</p>

  const isDeactivation = accessUser?.is_active === true
  const lastAdminConflict = access.error instanceof ApiError && access.error.status === 409

  function departmentLabel(user: User): string {
    if (!user.department_public_id) return 'Sin departamento'
    if (user.public_id === principal.public_id && ownDepartment.data?.public_id === user.department_public_id) return ownDepartment.data.name
    if (departmentNames.has(user.department_public_id)) return departmentNames.get(user.department_public_id)!
    if (canReadDepartments && departmentCatalog.isPending) return 'Cargando departamento…'
    return `ID: ${user.department_public_id.slice(0, 8)}…`
  }

  return <div className="flex min-h-0 flex-1 flex-col gap-6">
    <div>
      <h1 className="text-2xl font-semibold">Usuarios</h1>
      <p className="text-sm text-muted-foreground">Los usuarios aparecen después de su primer login con el rol local consultor. Aquí puedes administrar su acceso, rol y departamento.</p>
    </div>
    {list.isError && <ErrorMessage error={list.error} />}
    {departmentCatalog.isError && <ErrorMessage error={departmentCatalog.error} />}
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-md border" role="region" aria-label="Listado de usuarios" tabIndex={0}>
    <Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Correo</TableHead><TableHead>Rol local</TableHead><TableHead>Departamento</TableHead><TableHead>Acceso local</TableHead><TableHead>Actualizado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>
      {list.isPending && <TableRow><TableCell colSpan={7}>Cargando usuarios…</TableCell></TableRow>}
      {list.isSuccess && !list.data.data.length && <TableRow><TableCell colSpan={7}>Ningún usuario ha iniciado sesión todavía.</TableCell></TableRow>}
      {list.data?.data.map((user) => {
        const label = userLabel(user)
        return <TableRow key={user.public_id}>
          <TableCell>{user.full_name ?? '—'}</TableCell>
          <TableCell>{user.email ?? '—'}</TableCell>
          <TableCell>{user.role}</TableCell>
          <TableCell title={user.department_public_id ?? undefined}>{departmentLabel(user)}</TableCell>
          <TableCell><Badge variant={user.is_active ? 'default' : 'secondary'}>{user.is_active ? 'Activo' : 'Inactivo'}</Badge></TableCell>
          <TableCell>{formatDate(user.updated_at)}</TableCell>
          <TableCell><DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${label}`} />}><Ellipsis /></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setViewId(user.public_id)}>Ver detalle</DropdownMenuItem>
              {canAssignRole && <DropdownMenuItem onClick={() => setRoleUser(user)}>Asignar rol</DropdownMenuItem>}
              {canAssignDepartment && <DropdownMenuItem onClick={() => setDepartmentUser(user)}>Asignar departamento</DropdownMenuItem>}
              {canUpdate && <DropdownMenuItem variant={user.is_active ? 'destructive' : 'default'} onClick={() => { access.reset(); setAccessUser(user) }}>{user.is_active ? 'Desactivar acceso' : 'Reactivar acceso'}</DropdownMenuItem>}
            </DropdownMenuGroup></DropdownMenuContent>
          </DropdownMenu></TableCell>
        </TableRow>
      })}
    </TableBody></Table>
    </div>
    {list.isSuccess && <PageNavigation page={list.data.page} totalPages={list.data.total_pages} total={list.data.total} onPageChange={setPage} />}
    {viewId && <UserDetails id={viewId} principal={principal} onClose={() => setViewId(null)} />}
    {roleUser && <UserRoleEditor key={roleUser.public_id} user={roleUser} principal={principal} onClose={() => setRoleUser(null)} />}
    {departmentUser && <UserDepartmentEditor key={departmentUser.public_id} user={departmentUser} principal={principal} onClose={() => setDepartmentUser(null)} />}
    <AlertDialog open={!!accessUser} onOpenChange={(open) => { if (!open && !access.isPending) { setAccessUser(null); access.reset() } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isDeactivation ? 'Desactivar acceso local' : 'Reactivar acceso local'}</AlertDialogTitle>
          <AlertDialogDescription>{isDeactivation
            ? `Se revocarán todas las sesiones locales de ${accessUser ? userLabel(accessUser) : 'este usuario'}. Debe permanecer otro administrador activo. Después, retira su acceso a la aplicación en Microsoft Entra.`
            : `Restablece primero el acceso de ${accessUser ? userLabel(accessUser) : 'este usuario'} en Microsoft Entra. La reactivación no restaura sus sesiones; deberá iniciar sesión de nuevo.`}</AlertDialogDescription>
        </AlertDialogHeader>
        {access.isError && (lastAdminConflict
          ? <p role="alert" className="text-sm text-destructive">Debe permanecer al menos un administrador activo.</p>
          : <ErrorMessage error={access.error} />)}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={access.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant={isDeactivation ? 'destructive' : 'default'} disabled={access.isPending} onClick={() => { if (accessUser) access.mutate(accessUser) }}>
            {access.isPending ? 'Guardando…' : isDeactivation ? 'Desactivar' : 'Reactivar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
}
