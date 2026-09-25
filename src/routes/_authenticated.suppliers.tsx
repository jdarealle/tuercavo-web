import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import { Ellipsis, Plus } from 'lucide-react'
import { ApiError, type Principal } from '@/api/auth'
import { createSupplierSchema, fieldErrors, suppliers, type CatalogFilters, type CatalogStatus, type CreateSupplier, type Supplier, type UpdateSupplier } from '@/api/catalog'
import { ErrorMessage, HelpLabel, PageNavigation, SearchBar, StatusBadge, StatusSelect } from '@/components/catalog-ui'
import { formatDate } from '@/components/catalog-format'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldError, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/_authenticated/suppliers')({
  component: function SuppliersRoute() {
    const { principal } = Route.useRouteContext()
    return <SuppliersPage principal={principal} />
  },
})

function SupplierEditor({ supplier, onClose }: { supplier?: Supplier; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<CatalogStatus>(supplier?.status ?? 'active')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const mutation = useMutation({
    mutationFn: (input: CreateSupplier) => {
      if (!supplier) return suppliers.create(input)
      const changes: UpdateSupplier = {}
      for (const key of Object.keys(input) as (keyof CreateSupplier)[]) {
        if (input[key] !== supplier[key]) Object.assign(changes, { [key]: input[key] })
      }
      return suppliers.update(supplier.public_id, changes)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ])
      onClose()
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const result = v.safeParse(createSupplierSchema, {
      code: String(data.get('code') ?? ''),
      name: String(data.get('name') ?? ''),
      contact_name: String(data.get('contact_name') ?? '').trim() || null,
      email: String(data.get('email') ?? '').trim() || null,
      phone: String(data.get('phone') ?? '').trim() || null,
      status,
    })
    if (!result.success) { setErrors(fieldErrors(result.issues)); return }
    setErrors({})
    if (supplier && (Object.keys(result.output) as (keyof CreateSupplier)[]).every((key) => result.output[key] === supplier[key])) { onClose(); return }
    mutation.mutate(result.output)
  }

  const conflict = mutation.error instanceof ApiError && mutation.error.status === 409
  const errorFor = (field: string) => errors[field] || (conflict && field === 'code' ? 'Ya existe un proveedor con ese código.' : undefined)
  const clearError = (field: string) => { setErrors((current) => ({ ...current, [field]: '' })); if (mutation.isError) mutation.reset() }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent>
      <DialogHeader><DialogTitle>{supplier ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle><DialogDescription>Datos de contacto y estado del proveedor.</DialogDescription></DialogHeader>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <FieldGroup>
          <Field data-invalid={!!errorFor('code')}>
            <HelpLabel htmlFor="supplier-code" label="Código" required help="Único, de 1 a 64 caracteres. Empieza con letra o número; admite letras, números, punto, guion y guion bajo." />
            <Input id="supplier-code" name="code" defaultValue={supplier?.code ?? ''} required maxLength={64} aria-invalid={!!errorFor('code')} onChange={() => clearError('code')} />
            {errorFor('code') && <FieldError>{errorFor('code')}</FieldError>}
          </Field>
          <Field data-invalid={!!errorFor('name')}>
            <HelpLabel htmlFor="supplier-name" label="Nombre" required help="Hasta 150 caracteres, sin saltos de línea ni caracteres de control." />
            <Input id="supplier-name" name="name" defaultValue={supplier?.name ?? ''} required maxLength={150} aria-invalid={!!errorFor('name')} onChange={() => clearError('name')} />
            {errorFor('name') && <FieldError>{errorFor('name')}</FieldError>}
          </Field>
          <Field data-invalid={!!errorFor('contact_name')}>
            <HelpLabel htmlFor="supplier-contact" label="Contacto" help="Opcional. Nombre de la persona de contacto, hasta 150 caracteres." />
            <Input id="supplier-contact" name="contact_name" defaultValue={supplier?.contact_name ?? ''} maxLength={150} aria-invalid={!!errorFor('contact_name')} onChange={() => clearError('contact_name')} />
            {errorFor('contact_name') && <FieldError>{errorFor('contact_name')}</FieldError>}
          </Field>
          <Field data-invalid={!!errorFor('email')}>
            <HelpLabel htmlFor="supplier-email" label="Correo" help="Opcional. Correo válido, hasta 254 caracteres." />
            <Input id="supplier-email" name="email" type="email" defaultValue={supplier?.email ?? ''} maxLength={254} aria-invalid={!!errorFor('email')} onChange={() => clearError('email')} />
            {errorFor('email') && <FieldError>{errorFor('email')}</FieldError>}
          </Field>
          <Field data-invalid={!!errorFor('phone')}>
            <HelpLabel htmlFor="supplier-phone" label="Teléfono" help="Opcional. Hasta 32 caracteres; admite dígitos, espacios, +, -, paréntesis, punto y extensión x." />
            <Input id="supplier-phone" name="phone" type="tel" defaultValue={supplier?.phone ?? ''} maxLength={32} aria-invalid={!!errorFor('phone')} onChange={() => clearError('phone')} />
            {errorFor('phone') && <FieldError>{errorFor('phone')}</FieldError>}
          </Field>
          <Field><HelpLabel htmlFor="supplier-status" label="Estado" help="Solo los proveedores activos se pueden asignar a productos nuevos." /><StatusSelect id="supplier-status" value={status} onChange={(value) => { if (value !== 'all') setStatus(value) }} /></Field>
        </FieldGroup>
        {mutation.isError && !conflict && <ErrorMessage error={mutation.error} />}
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : 'Guardar'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

function SupplierDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const detail = useQuery({ queryKey: ['suppliers', 'detail', id], queryFn: () => suppliers.get(id) })
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Detalle de proveedor</DialogTitle><DialogDescription>Información registrada en la API.</DialogDescription></DialogHeader>
      {detail.isPending && <p>Cargando proveedor…</p>}
      {detail.isError && <ErrorMessage error={detail.error} />}
      {detail.data && <Table><TableBody>
        <TableRow><TableHead scope="row">Código</TableHead><TableCell>{detail.data.code}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Nombre</TableHead><TableCell>{detail.data.name}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Contacto</TableHead><TableCell>{detail.data.contact_name ?? '—'}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Correo</TableHead><TableCell>{detail.data.email ?? '—'}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Teléfono</TableHead><TableCell>{detail.data.phone ?? '—'}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Estado</TableHead><TableCell><StatusBadge status={detail.data.status} /></TableCell></TableRow>
        <TableRow><TableHead scope="row">Identificador</TableHead><TableCell>{detail.data.public_id}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Creado</TableHead><TableCell>{formatDate(detail.data.created_at)}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Actualizado</TableHead><TableCell>{formatDate(detail.data.updated_at)}</TableCell></TableRow>
      </TableBody></Table>}
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

function SuppliersPage({ principal }: { principal: Principal }) {
  const canRead = principal.permissions.includes('suppliers.read')
  const canCreate = principal.permissions.includes('suppliers.create')
  const canUpdate = principal.permissions.includes('suppliers.update')
  const canDelete = principal.permissions.includes('suppliers.delete')
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<CatalogFilters>({ page: 1, per_page: 20 })
  const [searchDraft, setSearchDraft] = useState('')
  const [editor, setEditor] = useState<{ supplier?: Supplier } | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Supplier | null>(null)
  const list = useQuery({ queryKey: ['suppliers', 'list', filters], queryFn: () => suppliers.list(filters), enabled: canRead, placeholderData: keepPreviousData })
  const deletion = useMutation({
    mutationFn: (id: string) => suppliers.remove(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ])
      if (filters.page && filters.page > 1 && list.data?.data.length === 1) setFilters((current) => ({ ...current, page: Math.max(1, (current.page ?? 1) - 1) }))
      setToDelete(null)
    },
  })
  if (!canRead) return <p>No tienes permiso para consultar proveedores.</p>
  return <div className="flex min-h-0 flex-1 flex-col gap-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Proveedores</h1><p className="text-sm text-muted-foreground">Consulta y administra los proveedores del catálogo.</p></div>{canCreate && <Button onClick={() => setEditor({})}><Plus /> Nuevo proveedor</Button>}</div>
    <div className="flex flex-wrap items-center gap-3"><SearchBar value={searchDraft} onChange={setSearchDraft} onSearch={() => setFilters((current) => ({ ...current, page: 1, search: searchDraft.trim() || undefined }))} placeholder="Buscar por nombre o código" /><StatusSelect includeAll value={filters.status ?? 'all'} onChange={(value) => setFilters((current) => ({ ...current, page: 1, status: value === 'all' ? undefined : value }))} /></div>
    {list.isError && <ErrorMessage error={list.error} />}
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-md border" role="region" aria-label="Listado de proveedores" tabIndex={0}>
    <Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Contacto</TableHead><TableHead>Correo</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>
      {list.isPending && <TableRow><TableCell colSpan={6}>Cargando proveedores…</TableCell></TableRow>}
      {list.isSuccess && !list.data.data.length && <TableRow><TableCell colSpan={6}>No hay proveedores para mostrar.</TableCell></TableRow>}
      {list.data?.data.map((supplier) => <TableRow key={supplier.public_id}><TableCell>{supplier.code}</TableCell><TableCell>{supplier.name}</TableCell><TableCell>{supplier.contact_name ?? '—'}</TableCell><TableCell>{supplier.email ?? '—'}</TableCell><TableCell><StatusBadge status={supplier.status} /></TableCell><TableCell>
        <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${supplier.name}`} />}><Ellipsis /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setViewId(supplier.public_id)}>Ver detalle</DropdownMenuItem>{canUpdate && <DropdownMenuItem onClick={() => setEditor({ supplier })}>Editar</DropdownMenuItem>}{canDelete && <DropdownMenuItem variant="destructive" onClick={() => setToDelete(supplier)}>Eliminar</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>
      </TableCell></TableRow>)}
    </TableBody></Table>
    </div>
    {list.isSuccess && <PageNavigation page={list.data.page} totalPages={list.data.total_pages} total={list.data.total} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />}
    {editor && <SupplierEditor key={editor.supplier?.public_id ?? 'new'} supplier={editor.supplier} onClose={() => setEditor(null)} />}
    {viewId && <SupplierDetails id={viewId} onClose={() => setViewId(null)} />}
    <AlertDialog open={!!toDelete} onOpenChange={(open) => { if (!open && !deletion.isPending) { setToDelete(null); deletion.reset() } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar proveedor</AlertDialogTitle><AlertDialogDescription>¿Eliminar {toDelete?.name}? Esta acción no se puede deshacer. Si tiene productos asociados, la API rechazará la eliminación.</AlertDialogDescription></AlertDialogHeader>{deletion.isError && <ErrorMessage error={deletion.error} />}<AlertDialogFooter><AlertDialogCancel disabled={deletion.isPending}>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={deletion.isPending} onClick={() => { if (toDelete) deletion.mutate(toDelete.public_id) }}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}
