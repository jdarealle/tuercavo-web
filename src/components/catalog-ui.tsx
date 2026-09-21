import { useState, type FormEvent } from 'react'
import * as v from 'valibot'
import { Info, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { searchSchema, type CatalogStatus } from '@/api/catalog'
import { statusLabels } from '@/components/catalog-format'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const statusItems = [
  { label: 'Todos los estados', value: 'all' },
  ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
]

export function HelpLabel({ htmlFor, label, help, required = false }: {
  htmlFor: string
  label: string
  help: string
  required?: boolean
}) {
  return <Tooltip>
    <TooltipTrigger render={<FieldLabel htmlFor={htmlFor} tabIndex={0}>
      {label}{required && ' *'} <Info size={14} aria-hidden="true" />
    </FieldLabel>} />
    <TooltipContent>{help}</TooltipContent>
  </Tooltip>
}

export function StatusBadge({ status }: { status: CatalogStatus }) {
  return <Badge>{statusLabels[status]}</Badge>
}

export function StatusSelect({ id, value, onChange, includeAll = false }: {
  id?: string
  value: CatalogStatus | 'all'
  onChange: (value: CatalogStatus | 'all') => void
  includeAll?: boolean
}) {
  const items = includeAll ? statusItems : statusItems.slice(1)
  return (
    <Select items={items} value={value} onValueChange={(next) => {
      if (next === 'all' || next === 'active' || next === 'inactive' || next === 'archived') onChange(next)
    }}>
      <SelectTrigger id={id} aria-label={id ? undefined : 'Estado'}><SelectValue /></SelectTrigger>
      <SelectContent><SelectGroup>{items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
    </Select>
  )
}

export function SearchBar({ value, onChange, onSearch, placeholder }: {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  placeholder: string
}) {
  const [error, setError] = useState<string | null>(null)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = v.safeParse(searchSchema, value)
    if (!result.success) {
      setError(result.issues[0]?.message ?? 'Revisa la búsqueda.')
      return
    }
    setError(null)
    onSearch()
  }
  return <form onSubmit={submit} noValidate className="flex min-w-0 gap-2">
    <Field data-invalid={!!error}>
      <Input aria-label="Buscar" aria-invalid={!!error} value={value} onChange={(event) => { onChange(event.target.value); setError(null) }} placeholder={placeholder} />
      {error && <FieldError>{error}</FieldError>}
    </Field>
    <Button type="submit" variant="outline"><Search /> Buscar</Button>
  </form>
}

export function PageNavigation({ page, totalPages, total, onPageChange }: {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}) {
  return <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
    <span>{total} registros · Página {page} de {Math.max(1, totalPages)}</span>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</Button>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Siguiente</Button>
    </div>
  </div>
}

export function ErrorMessage({ error }: { error: unknown }) {
  return <p role="alert" className="text-sm text-destructive">{error instanceof Error ? error.message : 'No se pudo completar la operación.'}</p>
}
