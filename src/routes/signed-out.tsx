import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/signed-out')({ component: SignedOutPage })

function SignedOutPage() {
  return <Navigate to="/login" replace />
}
