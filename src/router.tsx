import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  context: { queryClient: undefined! },
  defaultPreload: 'intent',
  defaultPendingComponent: () => <p className="p-4" role="status">Cargando…</p>,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
