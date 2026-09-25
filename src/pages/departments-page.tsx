import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import { Ellipsis, Plus } from 'lucide-react'
import { ApiError, type Principal } from '@/api/auth'
import { createDepartmentSchema, departments, type CreateDepartment } from '@/api/departments'
import { ErrorMessage, HelpLabel } from '@/components/catalog-ui'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldError, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function DepartmentEditor({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (input: CreateDepartment) => departments.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['departments'] })
      onClose()
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const result = v.safeParse(createDepartmentSchema, { name: String(data.get('name') ?? '') })
    if (!result.success) { setError(result.issues[0]?.message ?? 'Revisa el nombre.'); return }
    setError('')
    mutation.mutate(result.output)
  }

  const conflict = mutation.error instanceof ApiError && mutation.error.status === 409
  const nameError = error || (conflict ? 'Ya existe un departamento con ese nombre.' : '')

  return <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose() }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Nuevo departamento</DialogTitle><DialogDescription>Registra un departamento para asignarlo a usuarios.</DialogDescription></DialogHeader>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FieldGroup><Field data-invalid={!!nameError}>
          <HelpLabel htmlFor="department-name" label="Nombre" required help="Nombre único, de 1 a 150 caracteres después de quitar espacios al principio y al final. No admite caracteres de control." />
          <Input id="department-name" name="name" required maxLength={150} aria-invalid={!!nameError} onChange={() => { setError(''); if (mutation.isError) mutation.reset() }} />
          {nameError && <FieldError>{nameError}</FieldError>}
        </Field></FieldGroup>
        {mutation.isError && !conflict && <ErrorMessage error={mutation.error} />}
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : 'Crear departamento'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

function DepartmentDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const detail = useQuery({ queryKey: ['departments', 'detail', id], queryFn: () => departments.get(id) })
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Detalle de departamento</DialogTitle><DialogDescription>Información registrada en la API.</DialogDescription></DialogHeader>
      {detail.isPending && <p>Cargando departamento…</p>}
      {detail.isError && <ErrorMessage error={detail.error} />}
      {detail.data && <Table><TableBody>
        <TableRow><TableHead scope="row">Nombre</TableHead><TableCell>{detail.data.name}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Identificador</TableHead><TableCell className="break-all">{detail.data.public_id}</TableCell></TableRow>
      </TableBody></Table>}
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

export function DepartmentsPage({ principal }: { principal: Principal }) {
  const canRead = principal.role === 'admin' && principal.permissions.includes('departments.read')
  const canCreate = principal.role === 'admin' && principal.permissions.includes('departments.create')
  const [createOpen, setCreateOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  const list = useQuery({ queryKey: ['departments', 'list'], queryFn: departments.list, enabled: canRead, staleTime: 300_000 })

  if (!canRead) return <p>No tienes permiso para consultar departamentos.</p>

  return <div className="flex min-h-0 flex-1 flex-col gap-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">Departamentos</h1><p className="text-sm text-muted-foreground">Consulta y registra departamentos para la asignación local de usuarios.</p></div>
      {canCreate && <Button onClick={() => setCreateOpen(true)}><Plus data-icon="inline-start" /> Nuevo departamento</Button>}
    </div>
    {list.isError && <ErrorMessage error={list.error} />}
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-md border" role="region" aria-label="Listado de departamentos" tabIndex={0}>
      <Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Identificador</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>
        {list.isPending && <TableRow><TableCell colSpan={3}>Cargando departamentos…</TableCell></TableRow>}
        {list.isSuccess && !list.data.length && <TableRow><TableCell colSpan={3}>No hay departamentos para mostrar.</TableCell></TableRow>}
        {list.data?.map((department) => <TableRow key={department.public_id}>
          <TableCell>{department.name}</TableCell><TableCell className="break-all">{department.public_id}</TableCell>
          <TableCell><DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${department.name}`} />}><Ellipsis /></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuItem onClick={() => setViewId(department.public_id)}>Ver detalle</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent>
          </DropdownMenu></TableCell>
        </TableRow>)}
      </TableBody></Table>
    </div>
    {createOpen && <DepartmentEditor onClose={() => setCreateOpen(false)} />}
    {viewId && <DepartmentDetails id={viewId} onClose={() => setViewId(null)} />}
  </div>
}
