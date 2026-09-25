import { Suspense } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import {
  Navigate,
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import { sessionQueryOptions, type Principal } from './api/auth'
import { AppLayout } from './components/app-layout'
import { AuthenticatedError } from './components/authenticated-error'
import { SessionCheckError } from './lib/session-check-error'
import { DashboardPage } from './pages/dashboard-page'
import { CategoriesPage, DepartmentsPage, HealthPage, PermissionsPage, ProductsPage, RolesPage, SuppliersPage, UsersPage } from './pages/lazy-pages'
import { LoginPage } from './pages/login-page'
import { SignedOutPage } from './pages/signed-out-page'

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

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: () => <DashboardPage principal={authenticatedRoute.useRouteContext().principal} />,
})

const categoriesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/categories',
  component: () => <Suspense fallback={<p>Cargando categorías…</p>}><CategoriesPage principal={authenticatedRoute.useRouteContext().principal} /></Suspense>,
})

const productsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/products',
  component: () => <Suspense fallback={<p>Cargando productos…</p>}><ProductsPage principal={authenticatedRoute.useRouteContext().principal} /></Suspense>,
})

const suppliersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/suppliers',
  component: () => <Suspense fallback={<p>Cargando proveedores…</p>}><SuppliersPage principal={authenticatedRoute.useRouteContext().principal} /></Suspense>,
})

const departmentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/departments',
  component: () => <Suspense fallback={<p>Cargando departamentos…</p>}><DepartmentsPage principal={authenticatedRoute.useRouteContext().principal} /></Suspense>,
})

const usersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/users',
  component: () => <Suspense fallback={<p>Cargando usuarios…</p>}><UsersPage principal={authenticatedRoute.useRouteContext().principal} /></Suspense>,
})

const rolesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/roles',
  component: () => <Suspense fallback={<p>Cargando roles…</p>}><RolesPage principal={authenticatedRoute.useRouteContext().principal} /></Suspense>,
})

const permissionsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/permissions',
  component: () => <Suspense fallback={<p>Cargando permisos…</p>}><PermissionsPage principal={authenticatedRoute.useRouteContext().principal} /></Suspense>,
})

const healthRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/health',
  component: () => <Suspense fallback={<p>Cargando estado de la API…</p>}><HealthPage /></Suspense>,
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
    authenticatedRoute.addChildren([dashboardRoute, categoriesRoute, productsRoute, suppliersRoute, departmentsRoute, usersRoute, rolesRoute, permissionsRoute, healthRoute]),
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
