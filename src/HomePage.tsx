import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { sessionQueryOptions, type Principal } from './api/auth'

export function HomePage({ principal }: { principal: Principal }) {
  const session = useQuery({ ...sessionQueryOptions, refetchInterval: 60_000 })

  useEffect(() => {
    if (session.data === null || session.isError) {
      window.location.replace('/api/auth/login')
    }
  }, [session.data, session.isError])

  return <pre>{JSON.stringify({ mensaje: 'Bienvenido', usuario: session.data ?? principal }, null, 2)}</pre>
}
