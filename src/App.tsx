import type { QueryClient } from '@tanstack/react-query'
import {
  Navigate,
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import { sessionQueryOptions } from './api/auth'
import { HomePage } from './HomePage'

const loginUrl = () => new URL('/api/auth/login', window.location.origin).href

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ context }) => {
    const principal = await context.queryClient
      .fetchQuery({ ...sessionQueryOptions, staleTime: 0 })
      .catch(() => null)

    if (!principal) throw redirect({ href: loginUrl() })
    return { principal }
  },
  component: () => <Outlet />,
  notFoundComponent: () => <Navigate to="/" replace />,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <HomePage principal={rootRoute.useRouteContext().principal} />,
})

export const router = createRouter({
  routeTree: rootRoute.addChildren([homeRoute]),
  context: { queryClient: undefined! },
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
