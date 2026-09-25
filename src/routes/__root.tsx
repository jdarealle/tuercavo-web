import type { QueryClient } from '@tanstack/react-query'
import { Navigate, Outlet, createRootRouteWithContext } from '@tanstack/react-router'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  notFoundComponent: () => <Navigate to="/" replace />,
})
