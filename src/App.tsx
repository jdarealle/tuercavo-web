import type { QueryClient } from '@tanstack/react-query'
import {
  Navigate,
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router'
import { sessionQueryOptions, type Principal } from './api/auth'
import { AppLayout } from './components/app-layout'
import { AuthenticatedError } from './components/authenticated-error'
import { SessionCheckError } from './lib/session-check-error'
import { HomePage } from './HomePage'
import { LoginPage } from './pages/login-page'
import { SignedOutPage } from './pages/signed-out-page'

const CategoriesPage = lazyRouteComponent(() => import('./pages/categories-page'), 'CategoriesPage')
const ProductsPage = lazyRouteComponent(() => import('./pages/products-page'), 'ProductsPage')

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  notFoundComponent: () => <Navigate to="/" replace />,
})

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  beforeLoad: async ({ context }) => {
    let principal: Principal | null
    try {
      principal = await context.queryClient.fetchQuery({ ...sessionQueryOptions, staleTime: 0 })
    } catch (error) {
      throw new SessionCheckError(error)
    }

    if (!principal) throw redirect({ to: '/login', replace: true })
    return { principal }
  },
  component: () => <AppLayout principal={authenticatedRoute.useRouteContext().principal} />,
  errorComponent: AuthenticatedError,
})

const homeRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: () => <HomePage principal={authenticatedRoute.useRouteContext().principal} />,
})

const categoriesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/categories',
  component: () => <CategoriesPage principal={authenticatedRoute.useRouteContext().principal} />,
})

const productsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/products',
  component: () => <ProductsPage principal={authenticatedRoute.useRouteContext().principal} />,
})

const signedOutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signed-out',
  component: SignedOutPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    authenticatedRoute.addChildren([homeRoute, categoriesRoute, productsRoute]),
    loginRoute,
    signedOutRoute,
  ]),
  context: { queryClient: undefined! },
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
