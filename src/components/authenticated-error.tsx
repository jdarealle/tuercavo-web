import { ErrorComponent, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { SessionCheckError } from '@/lib/session-check-error'
import { SessionUnavailable } from '@/components/session-unavailable'

export function AuthenticatedError({ error }: ErrorComponentProps) {
  const router = useRouter()
  if (!(error instanceof SessionCheckError)) return <ErrorComponent error={error} />

  return <SessionUnavailable onRetry={() => { void router.invalidate() }} />
}
