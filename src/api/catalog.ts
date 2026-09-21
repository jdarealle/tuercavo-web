import * as v from 'valibot'
import { request } from './auth'

export const statusSchema = v.picklist(['active', 'inactive', 'archived'])
export const unitSchema = v.picklist(['piece', 'box', 'pack', 'meter', 'liter', 'kg'])

const uuid = v.pipe(v.string(), v.uuid('Introduce un identificador UUID válido.'))
const dateTime = v.string()
const apiText = (maximum: number) => v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty('Este campo es obligatorio.'),
  v.check((value) => Array.from(value).length <= maximum, `Máximo ${maximum} caracteres.`),
  v.check((value) => !/\p{Cc}/u.test(value), 'No se permiten saltos de línea ni caracteres de control.'),
)
const name = apiText(150)
const description = v.nullable(apiText(4000))
const brand = v.nullable(apiText(100))
const sku = v.pipe(v.string(), v.trim(), v.nonEmpty('El SKU es obligatorio.'), v.regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/, 'Usa de 1 a 64 caracteres: letras, números, punto, guion o guion bajo; empieza con letra o número.'))
const price = v.pipe(v.string(), v.trim(), v.nonEmpty('El precio es obligatorio.'), v.regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'Usa un importe entre 0 y 9999999999.99, con hasta dos decimales y punto decimal.'))
export const searchSchema = v.pipe(
  v.string(),
  v.trim(),
  v.check((value) => Array.from(value).length <= 150, 'La búsqueda admite hasta 150 caracteres.'),
  v.check((value) => !/\p{Cc}/u.test(value), 'La búsqueda no admite caracteres de control.'),
)

export const categorySchema = v.object({
  public_id: uuid,
  name: v.string(),
  description: v.nullable(v.string()),
  status: statusSchema,
  created_at: dateTime,
  updated_at: dateTime,
})

export const productSchema = v.object({
  public_id: uuid,
  sku: v.string(),
  name: v.string(),
  description: v.nullable(v.string()),
  brand: v.nullable(v.string()),
  category: uuid,
  supplier: v.nullable(uuid),
  unit: unitSchema,
  price: v.string(),
  status: statusSchema,
  created_at: dateTime,
  updated_at: dateTime,
})

const supplierSchema = v.object({
  public_id: uuid,
  code: v.string(),
  name: v.string(),
  status: statusSchema,
})

const page = <T extends v.GenericSchema>(item: T) => v.object({
  data: v.array(item),
  total: v.pipe(v.number(), v.integer(), v.minValue(0)),
  page: v.pipe(v.number(), v.integer(), v.minValue(1)),
  per_page: v.pipe(v.number(), v.integer(), v.minValue(1)),
  total_pages: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

const categoryPageSchema = page(categorySchema)
const productPageSchema = page(productSchema)
const supplierPageSchema = page(supplierSchema)

export const createCategorySchema = v.object({
  name,
  description,
  status: statusSchema,
})
export const updateCategorySchema = v.partial(createCategorySchema)

export const createProductSchema = v.object({
  sku,
  name,
  description,
  brand,
  category: uuid,
  supplier: v.nullable(uuid),
  unit: unitSchema,
  price,
  status: statusSchema,
})
export const updateProductSchema = v.partial(createProductSchema)

export function fieldErrors(issues: readonly v.BaseIssue<unknown>[]): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path?.[0]?.key
    if (typeof key === 'string' && !errors[key]) errors[key] = issue.message
  }
  return errors
}

export type Category = v.InferOutput<typeof categorySchema>
export type Product = v.InferOutput<typeof productSchema>
export type Supplier = v.InferOutput<typeof supplierSchema>
export type CatalogStatus = v.InferOutput<typeof statusSchema>
export type ProductUnit = v.InferOutput<typeof unitSchema>
export type CreateCategory = v.InferInput<typeof createCategorySchema>
export type UpdateCategory = v.InferInput<typeof updateCategorySchema>
export type CreateProduct = v.InferInput<typeof createProductSchema>
export type UpdateProduct = v.InferInput<typeof updateProductSchema>

export type CatalogFilters = {
  page?: number
  per_page?: number
  search?: string
  status?: CatalogStatus
  category?: string
  supplier?: string
}

function listUrl(resource: 'categories' | 'products' | 'suppliers', filters: CatalogFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    per_page: String(filters.per_page ?? 20),
  })
  if (filters.search?.trim()) params.set('search', filters.search.trim())
  if (filters.status) params.set('status', filters.status)
  if (resource === 'products' && filters.category) params.set('category', filters.category)
  if (resource === 'products' && filters.supplier) params.set('supplier', filters.supplier)
  return `/api/${resource}?${params}`
}

async function json<T extends v.GenericSchema>(path: string, schema: T, init?: RequestInit): Promise<v.InferOutput<T>> {
  const response = await request(path, init)
  return v.parse(schema, await response.json())
}

function jsonBody(method: 'POST' | 'PATCH', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export const categories = {
  list: (filters: CatalogFilters = {}) => json(listUrl('categories', filters), categoryPageSchema),
  get: (id: string) => json(`/api/categories/${encodeURIComponent(id)}`, categorySchema),
  create: (input: CreateCategory) => json('/api/categories', categorySchema, jsonBody('POST', v.parse(createCategorySchema, input))),
  update: (id: string, input: UpdateCategory) => json(`/api/categories/${encodeURIComponent(id)}`, categorySchema, jsonBody('PATCH', v.parse(updateCategorySchema, input))),
  remove: async (id: string) => { await request(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }) },
}

export const products = {
  list: (filters: CatalogFilters = {}) => json(listUrl('products', filters), productPageSchema),
  get: (id: string) => json(`/api/products/${encodeURIComponent(id)}`, productSchema),
  create: (input: CreateProduct) => json('/api/products', productSchema, jsonBody('POST', v.parse(createProductSchema, input))),
  update: (id: string, input: UpdateProduct) => json(`/api/products/${encodeURIComponent(id)}`, productSchema, jsonBody('PATCH', v.parse(updateProductSchema, input))),
  remove: async (id: string) => { await request(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' }) },
}

export const suppliers = {
  list: (filters: CatalogFilters = {}) => json(listUrl('suppliers', filters), supplierPageSchema),
}

export async function allCategories() {
  const first = await categories.list({ per_page: 100 })
  const data = [...first.data]
  for (let page = 2; page <= first.total_pages; page += 1) {
    data.push(...(await categories.list({ page, per_page: 100 })).data)
  }
  return data
}

export async function allSuppliers() {
  const first = await suppliers.list({ per_page: 100 })
  const data = [...first.data]
  for (let page = 2; page <= first.total_pages; page += 1) {
    data.push(...(await suppliers.list({ page, per_page: 100 })).data)
  }
  return data
}
