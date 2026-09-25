import { createFileRoute } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'
import tuercavoMark from '@/assets/tuercavo-mark.svg'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex items-center gap-2 self-center font-medium">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <img src={tuercavoMark} className="size-5" alt="" aria-hidden="true" />
          </span>
          Tuercavo
        </div>
        <section className="flex flex-col gap-6" aria-labelledby="login-title">
          <div className="flex flex-col gap-2 text-center">
            <h1 id="login-title" className="text-2xl font-semibold">Inicia sesión en tu cuenta</h1>
            <p className="text-sm text-muted-foreground">Usa tu cuenta empresarial de Microsoft Entra.</p>
          </div>
          <a
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}
            href="/api/auth/login?prompt=select_account"
          >
            Iniciar sesión con Entra ID
          </a>
        </section>
      </div>
    </main>
  )
}
