import { useState, type FormEvent } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import { Ellipsis, Plus } from 'lucide-react'
import { allCategories, allSuppliers, createProductSchema, fieldErrors, products, type Category, type CatalogFilters, type CatalogStatus, type CreateProduct, type Product, type ProductUnit, type Supplier, type UpdateProduct } from '@/api/catalog'
import { ApiError, type Principal } from '@/api/auth'
import { ErrorMessage, HelpLabel, PageNavigation, SearchBar, StatusBadge, StatusSelect } from '@/components/catalog-ui'
import { formatDate, unitLabels } from '@/components/catalog-format'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldError, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

const unitItems = Object.entries(unitLabels).map(([value, label]) => ({ value, label }))

function ProductDetails({ id, categoryNames, supplierNames, onClose }: {
  id: string
  categoryNames: Map<string, string>
  supplierNames: Map<string, string>
  onClose: () => void
}) {
  const detail = useQuery({ queryKey: ['products', 'detail', id], queryFn: () => products.get(id) })
  const product = detail.data
  return <Sheet open onOpenChange={(open) => { if (!open) onClose() }}>
    <SheetContent>
      <SheetHeader><SheetTitle>Detalle de producto</SheetTitle><SheetDescription>Información registrada en la API.</SheetDescription></SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {detail.isPending && <p>Cargando producto…</p>}
        {detail.isError && <ErrorMessage error={detail.error} />}
        {product && <Table><TableBody>
          <TableRow><TableHead scope="row">SKU</TableHead><TableCell>{product.sku}</TableCell></TableRow>
          <TableRow><TableHead scope="row">Nombre</TableHead><TableCell>{product.name}</TableCell></TableRow>
          <TableRow><TableHead scope="row">Descripción</TableHead><TableCell>{product.description ?? '—'}</TableCell></TableRow>
          <TableRow><TableHead scope="row">Marca</TableHead><TableCell>{product.brand ?? '—'}</TableCell></TableRow>
          <TableRow><TableHead scope="row">Categoría</TableHead><TableCell>{categoryNames.get(product.category) ?? product.category}</TableCell></TableRow>
          <TableRow><TableHead scope="row">Proveedor</TableHead><TableCell>{product.supplier ? supplierNames.get(product.supplier) ?? product.supplier : '—'}</TableCell></TableRow>
          <TableRow><TableHead scope="row">Unidad</TableHead><TableCell>{unitLabels[product.unit]}</TableCell></TableRow>
          <TableRow><TableHead scope="row">Precio</TableHead><TableCell>{product.price}</TableCell></TableRow>
          <TableRow><TableHead scope="row">Estado</TableHead><TableCell><StatusBadge status={product.status} /></TableCell></TableRow>
          <TableRow><TableHead scope="row">Identificador</TableHead><TableCell>{product.public_id}</TableCell></TableRow>
          <TableRow><TableHead scope="row">Creado</TableHead><TableCell>{formatDate(product.created_at)}</TableCell></TableRow>
          <TableRow><TableHead scope="row">Actualizado</TableHead><TableCell>{formatDate(product.updated_at)}</TableCell></TableRow>
        </TableBody></Table>}
      </div>
      <SheetFooter><Button type="button" variant="outline" onClick={onClose}>Cerrar</Button></SheetFooter>
    </SheetContent>
  </Sheet>
}

function ProductEditor({ product, categories, suppliers, canReadCategories, canReadSuppliers, categoriesLoading, categoriesError, suppliersLoading, suppliersError, onClose }: {
  product?: Product
  categories: Category[]
  suppliers: Supplier[]
  canReadCategories: boolean
  canReadSuppliers: boolean
  categoriesLoading: boolean
  categoriesError: boolean
  suppliersLoading: boolean
  suppliersError: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [categoryId, setCategoryId] = useState(product?.category ?? '')
  const [supplierId, setSupplierId] = useState(product?.supplier ?? 'none')
  const [unit, setUnit] = useState<ProductUnit>(product?.unit ?? 'piece')
  const [status, setStatus] = useState<CatalogStatus>(product?.status ?? 'active')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const categoryOptions = categories
    .filter((item) => item.status === 'active' || item.public_id === product?.category)
    .map((item) => ({ label: item.name, value: item.public_id }))
  const supplierOptions = [
    { label: 'Sin proveedor', value: 'none' },
    ...suppliers.filter((item) => item.status === 'active' || item.public_id === product?.supplier)
      .map((item) => ({ label: item.name, value: item.public_id })),
  ]
  const mutation = useMutation({
    mutationFn: (input: CreateProduct) => {
      if (!product) return products.create(input)
      const changes: UpdateProduct = {}
      for (const key of Object.keys(input) as (keyof CreateProduct)[]) {
        if (input[key] !== product[key]) Object.assign(changes, { [key]: input[key] })
      }
      return products.update(product.public_id, changes)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      onClose()
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const result = v.safeParse(createProductSchema, {
      sku: String(data.get('sku') ?? ''),
      name: String(data.get('name') ?? ''),
      description: String(data.get('description') ?? '').trim() || null,
      brand: String(data.get('brand') ?? '').trim() || null,
      category: canReadCategories && !categoriesError ? categoryId : String(data.get('category') ?? '').trim(),
      supplier: canReadSuppliers && !suppliersError
        ? (supplierId === 'none' ? null : supplierId)
        : String(data.get('supplier') ?? '').trim() || null,
      unit,
      price: String(data.get('price') ?? '').trim(),
      status,
    })
    if (!result.success) {
      setErrors(fieldErrors(result.issues))
      return
    }
    setErrors({})
    if (product && (Object.keys(result.output) as (keyof CreateProduct)[]).every((key) => result.output[key] === product[key])) {
      onClose()
      return
    }
    mutation.mutate(result.output)
  }

  const apiError = mutation.error instanceof ApiError ? mutation.error : null
  const serverField = apiError?.message.includes('category') ? 'category'
    : apiError?.message.includes('supplier') ? 'supplier'
      : apiError?.status === 409 && apiError.message.includes('identificador o nombre') ? 'sku' : null
  const errorFor = (field: string) => errors[field] || (serverField === field ? apiError?.message : undefined)
  const clearError = (field: string) => {
    setErrors((current) => ({ ...current, [field]: '' }))
    if (mutation.isError) mutation.reset()
  }

  return <Sheet open onOpenChange={(open) => { if (!open) onClose() }}>
    <SheetContent>
      <SheetHeader>
        <SheetTitle>{product ? 'Editar producto' : 'Nuevo producto'}</SheetTitle>
        <SheetDescription>Completa los datos del catálogo.</SheetDescription>
      </SheetHeader>
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errorFor('sku')}>
              <HelpLabel htmlFor="product-sku" label="SKU" required help="Único, hasta 64 caracteres. Empieza con letra o número; admite letras, números, punto, guion y guion bajo." />
              <Input id="product-sku" name="sku" defaultValue={product?.sku ?? ''} placeholder="SKU-001" maxLength={64} required aria-invalid={!!errorFor('sku')} autoCapitalize="off" spellCheck={false} onChange={() => clearError('sku')} />
              {errorFor('sku') && <FieldError>{errorFor('sku')}</FieldError>}
            </Field>
            <Field data-invalid={!!errorFor('name')}>
              <HelpLabel htmlFor="product-name" label="Nombre" required help="Hasta 150 caracteres, sin saltos de línea." />
              <Input id="product-name" name="name" defaultValue={product?.name ?? ''} required aria-invalid={!!errorFor('name')} onChange={() => clearError('name')} />
              {errorFor('name') && <FieldError>{errorFor('name')}</FieldError>}
            </Field>
          </div>
          <Field data-invalid={!!errorFor('description')}>
            <HelpLabel htmlFor="product-description" label="Descripción" help="Opcional. Hasta 4000 caracteres, sin saltos de línea." />
            <Textarea id="product-description" name="description" defaultValue={product?.description ?? ''} aria-invalid={!!errorFor('description')} onChange={() => clearError('description')} />
            {errorFor('description') && <FieldError>{errorFor('description')}</FieldError>}
          </Field>
          <Field data-invalid={!!errorFor('brand')}>
            <HelpLabel htmlFor="product-brand" label="Marca" help="Opcional. Hasta 100 caracteres, sin saltos de línea." />
            <Input id="product-brand" name="brand" defaultValue={product?.brand ?? ''} aria-invalid={!!errorFor('brand')} onChange={() => clearError('brand')} />
            {errorFor('brand') && <FieldError>{errorFor('brand')}</FieldError>}
          </Field>
          <Field data-invalid={!!errorFor('category') || (canReadCategories && (categoriesError || (!categoriesLoading && !categoryOptions.length)))}>
            <HelpLabel htmlFor="product-category" label="Categoría" required help={canReadCategories && !categoriesError
              ? 'Selecciona una categoría activa. Al editar puedes conservar la asignación actual.'
              : 'Introduce el UUID de una categoría activa. Al editar puedes conservar la asignación actual.'} />
            {canReadCategories && !categoriesError ? <Select items={categoryOptions} value={categoryId || null} onValueChange={(value) => { setCategoryId(value ?? ''); clearError('category') }}>
              <SelectTrigger id="product-category" aria-invalid={!!errorFor('category')} disabled={categoriesLoading}><SelectValue placeholder={categoriesLoading ? 'Cargando categorías…' : 'Selecciona una categoría'} /></SelectTrigger>
              <SelectContent><SelectGroup>{categoryOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
            </Select> : <Input id="product-category" name="category" defaultValue={product?.category ?? ''} placeholder="UUID de categoría" required aria-invalid={!!errorFor('category')} onChange={() => clearError('category')} />}
            {canReadCategories && categoriesError && <FieldError>No se pudo cargar la lista; introduce el UUID de la categoría.</FieldError>}
            {canReadCategories && !categoriesLoading && !categoriesError && categoryOptions.length === 0 && <FieldError>Primero crea una categoría activa.</FieldError>}
            {errorFor('category') && <FieldError>{errorFor('category')}</FieldError>}
          </Field>
          <Field data-invalid={!!errorFor('supplier')}>
            <HelpLabel htmlFor="product-supplier" label="Proveedor" help={canReadSuppliers && !suppliersError
              ? 'Opcional. Selecciona un proveedor activo o deja el producto sin proveedor.'
              : 'Opcional. Introduce el UUID de un proveedor activo o deja el campo vacío.'} />
            {canReadSuppliers && !suppliersError ? <Select items={supplierOptions} value={supplierId} onValueChange={(value) => { setSupplierId(value ?? 'none'); clearError('supplier') }}>
              <SelectTrigger id="product-supplier" aria-invalid={!!errorFor('supplier')} disabled={suppliersLoading}><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>{supplierOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
            </Select> : <Input id="product-supplier" name="supplier" defaultValue={product?.supplier ?? ''} placeholder="UUID de proveedor (opcional)" aria-invalid={!!errorFor('supplier')} onChange={() => clearError('supplier')} />}
            {canReadSuppliers && suppliersError && <FieldError>No se pudo cargar la lista; puedes introducir un UUID o dejarlo vacío.</FieldError>}
            {errorFor('supplier') && <FieldError>{errorFor('supplier')}</FieldError>}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <HelpLabel htmlFor="product-unit" label="Unidad" required help="Unidad en la que se registra este producto." />
              <Select items={unitItems} value={unit} onValueChange={(value) => { if (value && value in unitLabels) setUnit(value as ProductUnit) }}>
                <SelectTrigger id="product-unit"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>{unitItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
            <Field data-invalid={!!errorFor('price')}>
              <HelpLabel htmlFor="product-price" label="Precio" required help="De 0 a 9999999999.99. Usa punto decimal y hasta dos decimales." />
              <Input id="product-price" name="price" inputMode="decimal" defaultValue={product?.price ?? ''} placeholder="125.50" maxLength={13} required aria-invalid={!!errorFor('price')} onChange={() => clearError('price')} />
              {errorFor('price') && <FieldError>{errorFor('price')}</FieldError>}
            </Field>
          </div>
          <Field><HelpLabel htmlFor="product-status" label="Estado" help="Permite clasificar y filtrar el producto en el catálogo." /><StatusSelect id="product-status" value={status} onChange={(value) => { if (value !== 'all') setStatus(value) }} /></Field>
          </FieldGroup>
          {mutation.isError && !serverField && <ErrorMessage error={mutation.error} />}
        </div>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={mutation.isPending || (canReadCategories && !categoriesError && !categoryOptions.length)}>{mutation.isPending ? 'Guardando…' : 'Guardar'}</Button>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
}

export function ProductsPage({ principal }: { principal: Principal }) {
  const canRead = principal.permissions.includes('products.read')
  const canCreate = principal.permissions.includes('products.create')
  const canUpdate = principal.permissions.includes('products.update')
  const canDelete = principal.permissions.includes('products.delete')
  const canReadCategories = principal.permissions.includes('categories.read')
  const canReadSuppliers = principal.permissions.includes('suppliers.read')
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<CatalogFilters>({ page: 1, per_page: 20 })
  const [searchDraft, setSearchDraft] = useState('')
  const [editor, setEditor] = useState<{ product?: Product } | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Product | null>(null)
  const list = useQuery({ queryKey: ['products', 'list', filters], queryFn: () => products.list(filters), enabled: canRead, placeholderData: keepPreviousData })
  const categoryList = useQuery({ queryKey: ['categories', 'all'], queryFn: allCategories, enabled: canRead && canReadCategories, staleTime: 300_000 })
  const supplierList = useQuery({ queryKey: ['suppliers', 'all'], queryFn: allSuppliers, enabled: canRead && canReadSuppliers, staleTime: 300_000 })
  const deletion = useMutation({
    mutationFn: (id: string) => products.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      if (filters.page && filters.page > 1 && list.data?.data.length === 1) setFilters((current) => ({ ...current, page: Math.max(1, (current.page ?? 1) - 1) }))
      setToDelete(null)
    },
  })
  const categoryNames = new Map((categoryList.data ?? []).map((item) => [item.public_id, item.name]))
  const supplierNames = new Map((supplierList.data ?? []).map((item) => [item.public_id, item.name]))

  if (!canRead) return <p>No tienes permiso para consultar productos.</p>

  const categoryFilterOptions = [
    { label: 'Todas las categorías', value: 'all' },
    ...(categoryList.data ?? []).map((item) => ({ label: item.name, value: item.public_id })),
  ]
  const supplierFilterOptions = [
    { label: 'Todos los proveedores', value: 'all' },
    ...(supplierList.data ?? []).map((item) => ({ label: item.name, value: item.public_id })),
  ]

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">Productos</h1><p className="text-sm text-muted-foreground">Consulta y administra los artículos del catálogo.</p></div>
      {canCreate && <Button onClick={() => setEditor({})}><Plus /> Nuevo producto</Button>}
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <SearchBar value={searchDraft} onChange={setSearchDraft} onSearch={() => setFilters((current) => ({ ...current, page: 1, search: searchDraft.trim() || undefined }))} placeholder="Buscar por nombre o SKU" />
      <StatusSelect includeAll value={filters.status ?? 'all'} onChange={(value) => setFilters((current) => ({ ...current, page: 1, status: value === 'all' ? undefined : value }))} />
      {canReadCategories && <Select items={categoryFilterOptions} value={filters.category ?? 'all'} onValueChange={(value) => setFilters((current) => ({ ...current, page: 1, category: !value || value === 'all' ? undefined : value }))}>
        <SelectTrigger aria-label="Filtrar por categoría"><SelectValue /></SelectTrigger>
        <SelectContent><SelectGroup>{categoryFilterOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
      </Select>}
      {canReadSuppliers && <Select items={supplierFilterOptions} value={filters.supplier ?? 'all'} onValueChange={(value) => setFilters((current) => ({ ...current, page: 1, supplier: !value || value === 'all' ? undefined : value }))}>
        <SelectTrigger aria-label="Filtrar por proveedor"><SelectValue /></SelectTrigger>
        <SelectContent><SelectGroup>{supplierFilterOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
      </Select>}
    </div>
    {list.isError && <ErrorMessage error={list.error} />}
    {categoryList.isError && canReadCategories && <ErrorMessage error={categoryList.error} />}
    {supplierList.isError && canReadSuppliers && <ErrorMessage error={supplierList.error} />}
    <Table>
        <TableHeader><TableRow>
          <TableHead>SKU</TableHead><TableHead>Nombre</TableHead><TableHead>Marca</TableHead><TableHead>Categoría</TableHead><TableHead>Unidad</TableHead><TableHead>Precio</TableHead><TableHead>Estado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {list.isPending && <TableRow><TableCell colSpan={8}>Cargando productos…</TableCell></TableRow>}
          {list.isSuccess && !list.data.data.length && <TableRow><TableCell colSpan={8}>No hay productos para mostrar.</TableCell></TableRow>}
          {list.data?.data.map((product) => <TableRow key={product.public_id}>
            <TableCell>{product.sku}</TableCell>
            <TableCell>{product.name}</TableCell>
            <TableCell>{product.brand ?? '—'}</TableCell>
            <TableCell>{categoryNames.get(product.category) ?? product.category}</TableCell>
            <TableCell>{unitLabels[product.unit]}</TableCell>
            <TableCell>{product.price}</TableCell>
            <TableCell><StatusBadge status={product.status} /></TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${product.name}`} />}><Ellipsis /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setViewId(product.public_id)}>Ver detalle</DropdownMenuItem>
                  {canUpdate && <DropdownMenuItem onClick={() => setEditor({ product })}>Editar</DropdownMenuItem>}
                  {canDelete && <DropdownMenuItem variant="destructive" onClick={() => setToDelete(product)}>Eliminar</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>)}
        </TableBody>
    </Table>
    {list.isSuccess && <PageNavigation page={list.data.page} totalPages={list.data.total_pages} total={list.data.total} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />}
    {editor && <ProductEditor key={editor.product?.public_id ?? 'new'} product={editor.product} categories={categoryList.data ?? []} suppliers={supplierList.data ?? []} canReadCategories={canReadCategories} canReadSuppliers={canReadSuppliers} categoriesLoading={categoryList.isPending} categoriesError={categoryList.isError} suppliersLoading={supplierList.isPending} suppliersError={supplierList.isError} onClose={() => setEditor(null)} />}
    {viewId && <ProductDetails id={viewId} categoryNames={categoryNames} supplierNames={supplierNames} onClose={() => setViewId(null)} />}
    <AlertDialog open={!!toDelete} onOpenChange={(open) => { if (!open && !deletion.isPending) { setToDelete(null); deletion.reset() } }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Eliminar producto</AlertDialogTitle><AlertDialogDescription>¿Eliminar {toDelete?.name}? Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
        {deletion.isError && <ErrorMessage error={deletion.error} />}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletion.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={deletion.isPending} onClick={() => { if (toDelete) deletion.mutate(toDelete.public_id) }}>Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
}
