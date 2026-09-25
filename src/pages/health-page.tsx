import { useQuery } from '@tanstack/react-query'
import * as v from 'valibot'
import { request } from '@/api/auth'
import { ErrorMessage } from '@/components/catalog-ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table'

const healthSchema = v.object({ status: v.string() })
async function check(path: string) {
  const response = await request(path)
  return v.parse(healthSchema, await response.json())
}

export function HealthPage() {
  const live = useQuery({ queryKey: ['health', 'live'], queryFn: () => check('/api/health/live'), retry: false })
  const ready = useQuery({ queryKey: ['health', 'ready'], queryFn: () => check('/api/health/ready'), retry: false })
  return <div className="flex min-h-0 flex-1 flex-col gap-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Estado de la API</h1><p className="text-sm text-muted-foreground">Comprueba la disponibilidad del servicio y su conexión a la base de datos.</p></div><Button variant="outline" onClick={() => { void live.refetch(); void ready.refetch() }}>Actualizar</Button></div>
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-md border" role="region" aria-label="Estado de la API" tabIndex={0}>
      <Table><TableBody><TableRow><TableHead scope="row">Servicio</TableHead><TableCell>{live.isPending ? 'Comprobando…' : live.isError ? <ErrorMessage error={live.error} /> : <Badge>{live.data?.status}</Badge>}</TableCell></TableRow><TableRow><TableHead scope="row">Base de datos</TableHead><TableCell>{ready.isPending ? 'Comprobando…' : ready.isError ? <ErrorMessage error={ready.error} /> : <Badge>{ready.data?.status}</Badge>}</TableCell></TableRow></TableBody></Table>
    </div>
  </div>
}
