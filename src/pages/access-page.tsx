import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import * as v from 'valibot'
import { Ellipsis, Plus } from 'lucide-react'
import type { Principal } from '@/api/auth'
import { fieldErrors } from '@/api/catalog'
import { createRoleSchema, permissions, roles, setPermissionsSchema, updateRoleSchema, type Role } from '@/api/users'
import { ErrorMessage, HelpLabel } from '@/components/catalog-ui'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldError, FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

const adminRequired = ['users.read', 'users.update', 'users.assign_role', 'roles.read', 'roles.create', 'roles.update', 'roles.assign_permissions', 'permissions.read']
const consultantAllowed = ['products.read', 'categories.read', 'suppliers.read']

function RoleEditor({ role, onClose }: { role?: Role; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const mutation = useMutation({
    mutationFn: (input: { code: string; name: string }) => role ? roles.update(role.code, { name: input.name }) : roles.create(input),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['roles'] }); onClose() },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const input = { code: String(data.get('code') ?? ''), name: String(data.get('name') ?? '') }
    const result = role ? v.safeParse(updateRoleSchema, { name: input.name }) : v.safeParse(createRoleSchema, input)
    if (!result.success) { setErrors(fieldErrors(result.issues)); return }
    setErrors({})
    if (role && result.output.name === role.name) { onClose(); return }
    mutation.mutate({ code: input.code, name: result.output.name ?? '' })
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose() }}>
    <DialogContent>
      <DialogHeader><DialogTitle>{role ? 'Renombrar rol' : 'Nuevo rol'}</DialogTitle><DialogDescription>{role ? 'El código del rol permanece fijo.' : 'El nuevo rol se crea activo y sin permisos.'}</DialogDescription></DialogHeader>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FieldGroup>
          {!role && <Field data-invalid={!!errors.code}>
            <HelpLabel htmlFor="role-code" label="Código" required help="Único, hasta 32 caracteres. Empieza con una letra minúscula y admite letras minúsculas, números y guion bajo." />
            <Input id="role-code" name="code" required maxLength={32} aria-invalid={!!errors.code} onChange={() => setErrors((current) => ({ ...current, code: '' }))} />
            {errors.code && <FieldError>{errors.code}</FieldError>}
          </Field>}
          <Field data-invalid={!!errors.name}>
            <HelpLabel htmlFor="role-name" label="Nombre" required help="De 1 a 80 caracteres, sin caracteres de control. Se quitan los espacios al principio y al final." />
            <Input id="role-name" name="name" defaultValue={role?.name ?? ''} required maxLength={80} aria-invalid={!!errors.name} onChange={() => setErrors((current) => ({ ...current, name: '' }))} />
            {errors.name && <FieldError>{errors.name}</FieldError>}
          </Field>
        </FieldGroup>
        {mutation.isError && <ErrorMessage error={mutation.error} />}
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : 'Guardar'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

function RoleDetails({ code, onClose }: { code: string; onClose: () => void }) {
  const detail = useQuery({ queryKey: ['roles', 'detail', code], queryFn: () => roles.get(code) })
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Detalle de rol</DialogTitle><DialogDescription>Estado y permisos del rol en Tuercavo.</DialogDescription></DialogHeader>
      {detail.isPending && <p>Cargando rol…</p>}
      {detail.isError && <ErrorMessage error={detail.error} />}
      {detail.data && <>
        <Table><TableBody>
          <TableRow><TableHead scope="row">Código</TableHead><TableCell>{detail.data.code}</TableCell></TableRow>
          <TableRow><TableHead scope="row">Nombre</TableHead><TableCell>{detail.data.name}</TableCell></TableRow>
          <TableRow><TableHead scope="row">Estado</TableHead><TableCell><Badge variant={detail.data.is_active ? 'default' : 'secondary'}>{detail.data.is_active ? 'Activo' : 'Retirado'}</Badge></TableCell></TableRow>
          <TableRow><TableHead scope="row">Tipo</TableHead><TableCell>{detail.data.is_system ? 'Sistema' : 'Personalizado'}</TableCell></TableRow>
        </TableBody></Table>
        <div className="flex flex-col gap-2"><p>Permisos</p><div className="flex flex-wrap gap-2">{detail.data.permissions.length
          ? detail.data.permissions.map((permission) => <Badge key={permission} variant="outline">{permission}</Badge>)
          : <p className="text-muted-foreground">Sin permisos.</p>}</div></div>
      </>}
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

function RoleStatusDialog({ role, onClose }: { role: Role; onClose: () => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => roles.update(role.code, { is_active: !role.is_active }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['roles'] }); onClose() },
  })
  const retiring = role.is_active
  return <AlertDialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose() }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{retiring ? 'Retirar rol' : 'Reactivar rol'}</AlertDialogTitle>
        <AlertDialogDescription>{retiring
          ? `El rol ${role.code} dejará de poder asignarse. Debe estar libre de usuarios en todos los tenants, incluso usuarios inactivos.`
          : `El rol ${role.code} volverá a estar disponible para asignación.`}</AlertDialogDescription>
      </AlertDialogHeader>
      {mutation.isError && <ErrorMessage error={mutation.error} />}
      <AlertDialogFooter><AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel><AlertDialogAction variant={retiring ? 'destructive' : 'default'} disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Guardando…' : retiring ? 'Retirar' : 'Reactivar'}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}

function RolePermissionsEditor({ role, principal, onClose }: { role: Role; principal: Principal; onClose: () => void }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const canReadCatalog = principal.permissions.includes('permissions.read')
  const catalog = useQuery({ queryKey: ['permissions'], queryFn: permissions.list, enabled: canReadCatalog, staleTime: 300_000 })
  const [selected, setSelected] = useState<string[]>(role.permissions)
  const [codesText, setCodesText] = useState(role.permissions.join('\n'))
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [pending, setPending] = useState<string[]>([])
  const available = (catalog.data ?? []).filter((item) => role.code !== 'consultor' || consultantAllowed.includes(item.code))
  const mutation = useMutation({
    mutationFn: (codes: string[]) => roles.setPermissions(role.code, { permissions: codes }),
    onSuccess: (_, codes) => {
      const removed = role.permissions.some((permission) => !codes.includes(permission))
      if (role.code === principal.role && removed) {
        queryClient.clear()
        window.location.replace('/login')
        return
      }
      void queryClient.invalidateQueries({ queryKey: ['roles'] })
      if (role.code === principal.role) {
        void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
        void router.invalidate()
      }
      onClose()
    },
    onError: () => setConfirm(false),
  })

  function review() {
    const codes = canReadCatalog && catalog.isSuccess ? selected : codesText.split(/[\s,]+/).filter(Boolean)
    const result = v.safeParse(setPermissionsSchema, { permissions: codes })
    if (!result.success) { setError(result.issues[0]?.message ?? 'Revisa los permisos.'); return }
    if (role.code === 'admin' && adminRequired.some((permission) => !codes.includes(permission))) { setError('admin debe conservar sus permisos de administración.'); return }
    if (role.code === 'consultor' && codes.some((permission) => !consultantAllowed.includes(permission))) { setError('consultor solo admite lectura de productos, categorías y proveedores.'); return }
    if (codes.length === role.permissions.length && codes.every((permission) => role.permissions.includes(permission))) { onClose(); return }
    setError('')
    setPending([...codes].sort())
    setConfirm(true)
  }

  const removesPermissions = role.permissions.some((permission) => !pending.includes(permission))
  return <>
    <Dialog open={!confirm} onOpenChange={(open) => { if (!open && !confirm && !mutation.isPending) onClose() }}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader><DialogTitle>Permisos de {role.code}</DialogTitle><DialogDescription>La lista guardada reemplaza todos los permisos de este rol en todos los tenants.</DialogDescription></DialogHeader>
        <FieldGroup><Field data-invalid={!!error}>
          {canReadCatalog && catalog.isPending
            ? <p>Cargando permisos…</p>
            : canReadCatalog && catalog.isSuccess
            ? <FieldSet>
              <FieldLegend>Permisos</FieldLegend>
              <FieldGroup data-slot="checkbox-group" className="max-h-72 overflow-y-auto">
                {available.map((item) => {
                  const locked = role.code === 'admin' && adminRequired.includes(item.code)
                  return <Field key={item.code} orientation="horizontal" data-disabled={locked}>
                    <Checkbox id={`role-permission-${item.code}`} checked={selected.includes(item.code)} disabled={locked} onCheckedChange={(checked) => {
                      setSelected((current) => checked ? [...current, item.code] : current.filter((code) => code !== item.code))
                      setError('')
                    }} />
                    <HelpLabel htmlFor={`role-permission-${item.code}`} label={item.code} help={item.description} />
                  </Field>
                })}
              </FieldGroup>
            </FieldSet>
            : <><HelpLabel htmlFor="role-permissions" label="Permisos" help="Un código por línea. Puedes dejarlo vacío. Quitar permisos revoca las sesiones de los usuarios del rol." /><Textarea id="role-permissions" value={codesText} aria-invalid={!!error} onChange={(event) => { setCodesText(event.target.value); setError('') }} placeholder="Un código de permiso por línea" /></>}
          {error && <FieldError>{error}</FieldError>}
        </Field></FieldGroup>
        {catalog.isError && <ErrorMessage error={catalog.error} />}
        {mutation.isError && <ErrorMessage error={mutation.error} />}
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="button" onClick={review} disabled={mutation.isPending || (canReadCatalog && catalog.isPending)}>Revisar cambios</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirm} onOpenChange={(open) => { if (!open && !mutation.isPending) setConfirm(false) }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Reemplazar permisos de {role.code}</AlertDialogTitle><AlertDialogDescription>{removesPermissions
          ? 'Se revocarán las sesiones de todos los usuarios de este rol. Tendrán que iniciar sesión de nuevo.'
          : 'Los permisos agregados estarán disponibles en las siguientes peticiones. El cambio afecta a todos los tenants.'}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={mutation.isPending}>Volver</AlertDialogCancel><AlertDialogAction disabled={mutation.isPending} onClick={() => mutation.mutate(pending)}>{mutation.isPending ? 'Guardando…' : 'Guardar permisos'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
}

export function RolesPage({ principal }: { principal: Principal }) {
  const canRead = principal.permissions.includes('roles.read')
  const canCreate = principal.permissions.includes('roles.create')
  const canUpdate = principal.permissions.includes('roles.update')
  const canAssign = principal.permissions.includes('roles.assign_permissions')
  const [editor, setEditor] = useState<Role | 'new' | null>(null)
  const [viewCode, setViewCode] = useState<string | null>(null)
  const [statusRole, setStatusRole] = useState<Role | null>(null)
  const [permissionRole, setPermissionRole] = useState<Role | null>(null)
  const list = useQuery({ queryKey: ['roles', 'list'], queryFn: roles.list, enabled: canRead, staleTime: 300_000 })
  if (!canRead && !canCreate) return <p>No tienes permiso para administrar roles.</p>
  return <div className="flex min-h-0 flex-1 flex-col gap-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Roles</h1><p className="text-sm text-muted-foreground">Los roles y sus permisos se administran en Tuercavo y se aplican a todos los tenants.</p></div>{canCreate && <Button onClick={() => setEditor('new')}><Plus data-icon="inline-start" /> Nuevo rol</Button>}</div>
    {canRead && <>
      {list.isError && <ErrorMessage error={list.error} />}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-md border" role="region" aria-label="Listado de roles" tabIndex={0}>
      <Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Estado</TableHead><TableHead>Tipo</TableHead><TableHead>Permisos</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>
        {list.isPending && <TableRow><TableCell colSpan={6}>Cargando roles…</TableCell></TableRow>}
        {list.isSuccess && !list.data.length && <TableRow><TableCell colSpan={6}>No hay roles para mostrar.</TableCell></TableRow>}
        {list.data?.map((role) => <TableRow key={role.code}><TableCell>{role.code}</TableCell><TableCell>{role.name}</TableCell><TableCell><Badge variant={role.is_active ? 'default' : 'secondary'}>{role.is_active ? 'Activo' : 'Retirado'}</Badge></TableCell><TableCell>{role.is_system ? 'Sistema' : 'Personalizado'}</TableCell><TableCell>{role.permissions.length}</TableCell><TableCell><DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${role.code}`} />}><Ellipsis /></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setViewCode(role.code)}>Ver detalle</DropdownMenuItem>
            {canUpdate && <DropdownMenuItem onClick={() => setEditor(role)}>Renombrar</DropdownMenuItem>}
            {canAssign && <DropdownMenuItem onClick={() => setPermissionRole(role)}>Editar permisos</DropdownMenuItem>}
            {canUpdate && !role.is_system && <DropdownMenuItem variant={role.is_active ? 'destructive' : 'default'} onClick={() => setStatusRole(role)}>{role.is_active ? 'Retirar' : 'Reactivar'}</DropdownMenuItem>}
          </DropdownMenuGroup></DropdownMenuContent>
        </DropdownMenu></TableCell></TableRow>)}
      </TableBody></Table>
      </div>
    </>}
    {editor && <RoleEditor key={editor === 'new' ? 'new' : editor.code} role={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} />}
    {viewCode && <RoleDetails code={viewCode} onClose={() => setViewCode(null)} />}
    {statusRole && <RoleStatusDialog key={statusRole.code} role={statusRole} onClose={() => setStatusRole(null)} />}
    {permissionRole && <RolePermissionsEditor key={permissionRole.code} role={permissionRole} principal={principal} onClose={() => setPermissionRole(null)} />}
  </div>
}

export function PermissionsPage({ principal }: { principal: Principal }) {
  const canRead = principal.permissions.includes('permissions.read')
  const list = useQuery({ queryKey: ['permissions'], queryFn: permissions.list, enabled: canRead, staleTime: 300_000 })
  if (!canRead) return <p>No tienes permiso para consultar permisos.</p>
  return <div className="flex min-h-0 flex-1 flex-col gap-6">
    <div><h1 className="text-2xl font-semibold">Permisos</h1><p className="text-sm text-muted-foreground">Operaciones disponibles en la API para configurar los roles.</p></div>
    {list.isError && <ErrorMessage error={list.error} />}
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-md border" role="region" aria-label="Listado de permisos" tabIndex={0}>
      <Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Descripción</TableHead></TableRow></TableHeader><TableBody>{list.isPending && <TableRow><TableCell colSpan={2}>Cargando permisos…</TableCell></TableRow>}{list.isSuccess && !list.data.length && <TableRow><TableCell colSpan={2}>No hay permisos para mostrar.</TableCell></TableRow>}{list.data?.map((permission) => <TableRow key={permission.code}><TableCell>{permission.code}</TableCell><TableCell>{permission.description}</TableCell></TableRow>)}</TableBody></Table>
    </div>
  </div>
}
