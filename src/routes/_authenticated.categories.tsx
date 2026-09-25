import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import { Ellipsis, Plus } from 'lucide-react'
import { categories, createCategorySchema, fieldErrors, type Category, type CatalogFilters, type CatalogStatus, type CreateCategory, type UpdateCategory } from '@/api/catalog'
import { ApiError, type Principal } from '@/api/auth'
import { ErrorMessage, HelpLabel, PageNavigation, SearchBar, StatusBadge, StatusSelect } from '@/components/catalog-ui'
import { formatDate } from '@/components/catalog-format'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldError, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/_authenticated/categories')({
  component: function CategoriesRoute() {
    const { principal } = Route.useRouteContext()
    return <CategoriesPage principal={principal} />
  },
})

function CategoryEditor({ category, onClose }: { category?: Category; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<CatalogStatus>(category?.status ?? 'active')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const mutation = useMutation({
    mutationFn: (input: CreateCategory) => {
      if (!category) return categories.create(input)
      const changes: UpdateCategory = {}
      if (input.name !== category.name) changes.name = input.name
      if (input.description !== category.description) changes.description = input.description
      if (input.status !== category.status) changes.status = input.status
      return categories.update(category.public_id, changes)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ])
      onClose()
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const result = v.safeParse(createCategorySchema, {
      name: String(data.get('name') ?? ''),
      description: String(data.get('description') ?? '').trim() || null,
      status,
    })
    if (!result.success) {
      setErrors(fieldErrors(result.issues))
      return
    }
    setErrors({})
    if (category && result.output.name === category.name && result.output.description === category.description && result.output.status === category.status) {
      onClose()
      return
    }
    mutation.mutate(result.output)
  }

  const nameError = errors.name ?? (mutation.error instanceof ApiError && mutation.error.status === 409 ? 'Ya existe una categoría con ese nombre.' : undefined)
  const clearError = (field: string) => {
    setErrors((current) => ({ ...current, [field]: '' }))
    if (mutation.isError) mutation.reset()
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{category ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
        <DialogDescription>Completa los datos de la categoría.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <FieldGroup>
          <Field data-invalid={!!nameError}>
            <HelpLabel htmlFor="category-name" label="Nombre" required help="Hasta 150 caracteres. El nombre debe ser único." />
            <Input id="category-name" name="name" defaultValue={category?.name ?? ''} required aria-invalid={!!nameError} onChange={() => clearError('name')} />
            {nameError && <FieldError>{nameError}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.description}>
            <HelpLabel htmlFor="category-description" label="Descripción" help="Opcional. Hasta 4000 caracteres, sin saltos de línea." />
            <Textarea id="category-description" name="description" defaultValue={category?.description ?? ''} aria-invalid={!!errors.description} onChange={() => clearError('description')} />
            {errors.description && <FieldError>{errors.description}</FieldError>}
          </Field>
          <Field>
            <HelpLabel htmlFor="category-status" label="Estado" help="Solo las categorías activas pueden asignarse a productos nuevos." />
            <StatusSelect id="category-status" value={status} onChange={(value) => { if (value !== 'all') setStatus(value) }} />
          </Field>
        </FieldGroup>
        {mutation.isError && !(mutation.error instanceof ApiError && mutation.error.status === 409) && <ErrorMessage error={mutation.error} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : 'Guardar'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

function CategoryDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const detail = useQuery({ queryKey: ['categories', 'detail', id], queryFn: () => categories.get(id) })
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Detalle de categoría</DialogTitle><DialogDescription>Información registrada en la API.</DialogDescription></DialogHeader>
      {detail.isPending && <p>Cargando categoría…</p>}
      {detail.isError && <ErrorMessage error={detail.error} />}
      {detail.data && <Table><TableBody>
        <TableRow><TableHead scope="row">Nombre</TableHead><TableCell>{detail.data.name}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Descripción</TableHead><TableCell>{detail.data.description ?? '—'}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Estado</TableHead><TableCell><StatusBadge status={detail.data.status} /></TableCell></TableRow>
        <TableRow><TableHead scope="row">Identificador</TableHead><TableCell>{detail.data.public_id}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Creada</TableHead><TableCell>{formatDate(detail.data.created_at)}</TableCell></TableRow>
        <TableRow><TableHead scope="row">Actualizada</TableHead><TableCell>{formatDate(detail.data.updated_at)}</TableCell></TableRow>
      </TableBody></Table>}
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

function CategoriesPage({ principal }: { principal: Principal }) {
  const canRead = principal.permissions.includes('categories.read')
  const canCreate = principal.permissions.includes('categories.create')
  const canUpdate = principal.permissions.includes('categories.update')
  const canDelete = principal.permissions.includes('categories.delete')
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<CatalogFilters>({ page: 1, per_page: 20 })
  const [searchDraft, setSearchDraft] = useState('')
  const [editor, setEditor] = useState<{ category?: Category } | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Category | null>(null)
  const list = useQuery({
    queryKey: ['categories', 'list', filters],
    queryFn: () => categories.list(filters),
    enabled: canRead,
    placeholderData: keepPreviousData,
  })
  const deletion = useMutation({
    mutationFn: (id: string) => categories.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      if (filters.page && filters.page > 1 && list.data?.data.length === 1) setFilters((current) => ({ ...current, page: Math.max(1, (current.page ?? 1) - 1) }))
      setToDelete(null)
    },
  })

  if (!canRead) return <p>No tienes permiso para consultar categorías.</p>

  return <div className="flex min-h-0 flex-1 flex-col gap-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">Categorías</h1><p className="text-sm text-muted-foreground">Organiza el catálogo de productos.</p></div>
      {canCreate && <Button onClick={() => setEditor({})}><Plus /> Nueva categoría</Button>}
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <SearchBar value={searchDraft} onChange={setSearchDraft} onSearch={() => setFilters((current) => ({ ...current, page: 1, search: searchDraft.trim() || undefined }))} placeholder="Buscar por nombre" />
      <StatusSelect includeAll value={filters.status ?? 'all'} onChange={(value) => setFilters((current) => ({ ...current, page: 1, status: value === 'all' ? undefined : value }))} />
    </div>
    {list.isError && <ErrorMessage error={list.error} />}
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-md border" role="region" aria-label="Listado de categorías" tabIndex={0}>
    <Table>
        <TableHeader><TableRow>
          <TableHead>Nombre</TableHead><TableHead>Descripción</TableHead><TableHead>Estado</TableHead><TableHead>Actualizada</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {list.isPending && <TableRow><TableCell colSpan={5}>Cargando categorías…</TableCell></TableRow>}
          {list.isSuccess && !list.data.data.length && <TableRow><TableCell colSpan={5}>No hay categorías para mostrar.</TableCell></TableRow>}
          {list.data?.data.map((category) => <TableRow key={category.public_id}>
            <TableCell>{category.name}</TableCell>
            <TableCell>{category.description ?? '—'}</TableCell>
            <TableCell><StatusBadge status={category.status} /></TableCell>
            <TableCell>{formatDate(category.updated_at)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${category.name}`} />}><Ellipsis /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setViewId(category.public_id)}>Ver detalle</DropdownMenuItem>
                  {canUpdate && <DropdownMenuItem onClick={() => setEditor({ category })}>Editar</DropdownMenuItem>}
                  {canDelete && <DropdownMenuItem variant="destructive" onClick={() => setToDelete(category)}>Eliminar</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>)}
        </TableBody>
    </Table>
    </div>
    {list.isSuccess && <PageNavigation page={list.data.page} totalPages={list.data.total_pages} total={list.data.total} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />}
    {editor && <CategoryEditor key={editor.category?.public_id ?? 'new'} category={editor.category} onClose={() => setEditor(null)} />}
    {viewId && <CategoryDetails id={viewId} onClose={() => setViewId(null)} />}
    <AlertDialog open={!!toDelete} onOpenChange={(open) => { if (!open && !deletion.isPending) { setToDelete(null); deletion.reset() } }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Eliminar categoría</AlertDialogTitle><AlertDialogDescription>¿Eliminar {toDelete?.name}? Esta acción no se puede deshacer. Si tiene productos asociados, la API rechazará la eliminación.</AlertDialogDescription></AlertDialogHeader>
        {deletion.isError && (deletion.error instanceof ApiError && deletion.error.status === 409
          ? <p role="alert" className="text-sm text-destructive">No se puede eliminar esta categoría mientras tenga productos asociados.</p>
          : <ErrorMessage error={deletion.error} />)}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletion.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={deletion.isPending} onClick={() => { if (toDelete) deletion.mutate(toDelete.public_id) }}>Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
}
