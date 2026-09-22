import { Button } from '@/components/ui/button'

export function SessionUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">No se pudo cargar la aplicación</h1>
        <p className="text-muted-foreground">Intenta de nuevo en unos momentos.</p>
        <Button onClick={onRetry}>Reintentar</Button>
      </div>
    </main>
  )
}
