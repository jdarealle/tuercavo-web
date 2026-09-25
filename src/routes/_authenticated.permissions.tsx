import { createFileRoute } from '@tanstack/react-router'
import { PermissionsPage } from '@/features/access/access-page'

export const Route = createFileRoute('/_authenticated/permissions')({
  component: function PermissionsRoute() {
    const { principal } = Route.useRouteContext()
    return <PermissionsPage principal={principal} />
  },
})
