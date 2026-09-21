import type { CatalogStatus, ProductUnit } from '@/api/catalog'

export const statusLabels: Record<CatalogStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  archived: 'Archivado',
}

export const unitLabels: Record<ProductUnit, string> = {
  piece: 'Pieza',
  box: 'Caja',
  pack: 'Paquete',
  meter: 'Metro',
  liter: 'Litro',
  kg: 'Kilogramo',
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value))
}
