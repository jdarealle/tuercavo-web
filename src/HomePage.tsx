import { Link } from '@tanstack/react-router'
import { FolderTree, Package } from 'lucide-react'
import type { Principal } from './api/auth'
import { buttonVariants } from '@/components/ui/button'

export function HomePage({ principal }: { principal: Principal }) {
  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">Bienvenido, {principal.full_name}</h1>
      <p className="text-sm text-muted-foreground">Selecciona un módulo para empezar.</p>
    </div>
    <div className="flex flex-wrap gap-3">
      {principal.permissions.includes('categories.read') && <Link to="/categories" className={buttonVariants({ variant: 'outline' })}><FolderTree /> Categorías</Link>}
      {principal.permissions.includes('products.read') && <Link to="/products" className={buttonVariants({ variant: 'outline' })}><Package /> Productos</Link>}
    </div>
  </div>
}
