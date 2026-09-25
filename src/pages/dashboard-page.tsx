import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { FolderTree, Package, RefreshCw, Truck, Users, type LucideIcon } from 'lucide-react'
import type { Principal } from '@/api/auth'
import { categories, products, suppliers } from '@/api/catalog'
import { users } from '@/api/users'
import { ErrorMessage, StatusBadge } from '@/components/catalog-ui'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ModulePath = '/products' | '/categories' | '/suppliers' | '/users'

function MetricCard({ title, total, pending, error, icon: Icon, to }: {
  title: string
  total?: number
  pending: boolean
  error: unknown
  icon: LucideIcon
  to: ModulePath
}) {
  return <Card>
    <CardHeader>
      <CardTitle><h2>{title}</h2></CardTitle>
      <CardDescription>Registros totales</CardDescription>
      <CardAction><Icon aria-hidden="true" className="size-5 text-muted-foreground" /></CardAction>
    </CardHeader>
    <CardContent>
      {pending ? <Skeleton className="h-9 w-20" /> : error ? <ErrorMessage error={error} /> : <p className="text-3xl font-semibold tabular-nums">{new Intl.NumberFormat('es-MX').format(total ?? 0)}</p>}
    </CardContent>
    <CardFooter><Button variant="link" size="sm" render={<Link to={to} />}>Ver módulo</Button></CardFooter>
  </Card>
}

export function DashboardPage({ principal }: { principal: Principal }) {
  const queryClient = useQueryClient()
  const canReadProducts = principal.permissions.includes('products.read')
  const canReadCategories = principal.permissions.includes('categories.read')
  const canReadSuppliers = principal.permissions.includes('suppliers.read')
  const canReadUsers = principal.permissions.includes('users.read')

  const productList = useQuery({ queryKey: ['products', 'dashboard'], queryFn: () => products.list({ page: 1, per_page: 5 }), enabled: canReadProducts, staleTime: 30_000 })
  const categoryList = useQuery({ queryKey: ['categories', 'dashboard'], queryFn: () => categories.list({ page: 1, per_page: 1 }), enabled: canReadCategories, staleTime: 30_000 })
  const supplierList = useQuery({ queryKey: ['suppliers', 'dashboard'], queryFn: () => suppliers.list({ page: 1, per_page: 1 }), enabled: canReadSuppliers, staleTime: 30_000 })
  const userList = useQuery({ queryKey: ['users', 'dashboard'], queryFn: () => users.list(1), enabled: canReadUsers, staleTime: 30_000 })

  function refresh() {
    void Promise.all(['products', 'categories', 'suppliers', 'users'].map((resource) =>
      queryClient.invalidateQueries({ queryKey: [resource, 'dashboard'] })
    ))
  }

  return <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen de los módulos a los que tienes acceso.</p>
      </div>
      <Button variant="outline" onClick={refresh}><RefreshCw data-icon="inline-start" /> Actualizar</Button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {canReadProducts && <MetricCard title="Productos" total={productList.data?.total} pending={productList.isPending} error={productList.error} icon={Package} to="/products" />}
      {canReadCategories && <MetricCard title="Categorías" total={categoryList.data?.total} pending={categoryList.isPending} error={categoryList.error} icon={FolderTree} to="/categories" />}
      {canReadSuppliers && <MetricCard title="Proveedores" total={supplierList.data?.total} pending={supplierList.isPending} error={supplierList.error} icon={Truck} to="/suppliers" />}
      {canReadUsers && <MetricCard title="Usuarios" total={userList.data?.total} pending={userList.isPending} error={userList.error} icon={Users} to="/users" />}
    </div>

    {canReadProducts && <Card className="lg:min-h-0 lg:flex-1">
      <CardHeader>
        <CardTitle><h2>Productos del catálogo</h2></CardTitle>
        <CardDescription>Primeros cinco productos en el orden del listado de la API.</CardDescription>
        <CardAction><Button variant="outline" size="sm" render={<Link to="/products" />}>Ver todos</Button></CardAction>
      </CardHeader>
      <CardContent className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {productList.isError && <ErrorMessage error={productList.error} />}
        <div className="min-w-0 overflow-y-auto rounded-md border lg:min-h-0 lg:flex-1" role="region" aria-label="Productos del catálogo" tabIndex={0}>
        <Table>
          <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Nombre</TableHead><TableHead>Precio</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
          <TableBody>
            {productList.isPending && <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>}
            {productList.isSuccess && productList.data.data.length === 0 && <TableRow><TableCell colSpan={4}>No hay productos para mostrar.</TableCell></TableRow>}
            {productList.data?.data.map((product) => <TableRow key={product.public_id}>
              <TableCell>{product.sku}</TableCell>
              <TableCell>{product.name}</TableCell>
              <TableCell>{product.price}</TableCell>
              <TableCell><StatusBadge status={product.status} /></TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
        </div>
      </CardContent>
      <CardFooter>El listado completo está disponible en Productos.</CardFooter>
    </Card>}
  </div>
}
