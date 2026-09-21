import { useEffect, useState } from 'react'
import { Outlet } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sessionQueryOptions, type Principal } from '@/api/auth'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export function AppLayout({ principal }: { principal: Principal }) {
  const [signedOut, setSignedOut] = useState(false)
  const queryClient = useQueryClient()
  const session = useQuery({ ...sessionQueryOptions, enabled: !signedOut, refetchInterval: signedOut ? false : 60_000 })

  useEffect(() => {
    if (!signedOut && (session.data === null || session.isError)) window.location.replace('/api/auth/login')
  }, [session.data, session.isError, signedOut])

  if (signedOut) return <main><h1>Sesión cerrada</h1></main>

  const user = session.data ?? principal

  return (
    <SidebarProvider>
      <AppSidebar principal={user} onSignedOut={() => {
        setSignedOut(true)
        queryClient.clear()
      }} />
      <main className="min-w-0 flex-1">
        <SidebarTrigger />
        <div className="p-4">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  )
}
