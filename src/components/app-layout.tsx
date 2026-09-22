import { useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { sessionQueryOptions, type Principal } from '@/api/auth'
import { AppSidebar } from '@/components/app-sidebar'
import { SessionUnavailable } from '@/components/session-unavailable'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export function AppLayout({ principal }: { principal: Principal }) {
  const session = useQuery({ ...sessionQueryOptions, refetchInterval: 60_000 })

  useEffect(() => {
    if (session.data === null) window.location.replace('/login')
  }, [session.data])

  if (session.data === null) return null
  if (session.isError) return <SessionUnavailable onRetry={() => { void session.refetch() }} />

  const user = session.data ?? principal

  return (
    <SidebarProvider>
      <AppSidebar principal={user} />
      <main className="min-w-0 flex-1">
        <SidebarTrigger />
        <div className="p-4">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  )
}
