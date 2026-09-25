import { createFileRoute } from '@tanstack/react-router'
import { RolesPage } from '@/features/access/access-page'

export const Route = createFileRoute('/_authenticated/roles')({
  component: function RolesRoute() {
    const { principal } = Route.useRouteContext()
    return <RolesPage principal={principal} />
  },
})
