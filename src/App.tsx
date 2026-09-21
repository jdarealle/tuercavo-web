import type { QueryClient } from '@tanstack/react-query'
import {
  Navigate,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router'
import { sessionQueryOptions } from './api/auth'
import { AppLayout } from './components/app-layout'
import { HomePage } from './HomePage'

const CategoriesPage = lazyRouteComponent(() => import('./pages/categories-page'), 'CategoriesPage')
const ProductsPage = lazyRouteComponent(() => import('./pages/products-page'), 'ProductsPage')

const loginUrl = () => new URL('/api/auth/login', window.location.origin).href

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ context }) => {
    const principal = await context.queryClient
      .fetchQuery({ ...sessionQueryOptions, staleTime: 0 })
      .catch(() => null)

    if (!principal) throw redirect({ href: loginUrl() })
    return { principal }
  },
  component: () => <AppLayout principal={rootRoute.useRouteContext().principal} />,
  notFoundComponent: () => <Navigate to="/" replace />,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <HomePage principal={rootRoute.useRouteContext().principal} />,
})

const categoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/categories',
  component: () => <CategoriesPage principal={rootRoute.useRouteContext().principal} />,
})

const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/products',
  component: () => <ProductsPage principal={rootRoute.useRouteContext().principal} />,
})

export const router = createRouter({
  routeTree: rootRoute.addChildren([homeRoute, categoriesRoute, productsRoute]),
  context: { queryClient: undefined! },
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
