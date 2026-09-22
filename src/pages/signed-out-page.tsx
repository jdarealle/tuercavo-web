import { Navigate } from '@tanstack/react-router'

export function SignedOutPage() {
  return <Navigate to="/login" replace />
}
