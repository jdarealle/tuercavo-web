import { createFileRoute, redirect } from '@tanstack/react-router'
import { sessionQueryOptions, type Principal } from '@/api/auth'
import { AppLayout } from '@/components/app-layout'
import { AuthenticatedError } from '@/components/authenticated-error'
import { SessionCheckError } from '@/lib/session-check-error'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    let principal: Principal | null
    try {
      principal = await context.queryClient.query(sessionQueryOptions)
    } catch (error) {
      throw new SessionCheckError(error)
    }

    if (!principal) throw redirect({ to: '/login', replace: true })
    return { principal }
  },
  component: function AuthenticatedLayout() {
    const { principal } = Route.useRouteContext()
    return <AppLayout principal={principal} />
  },
  errorComponent: AuthenticatedError,
})
