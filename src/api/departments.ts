import { queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { request } from './auth'

const uuid = v.pipe(v.string(), v.uuid('Introduce un UUID válido.'))

export const departmentSchema = v.object({
  public_id: uuid,
  name: v.string(),
})

export const createDepartmentSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('El nombre es obligatorio.'),
    v.maxLength(150, 'Máximo 150 caracteres.'),
    v.check((value) => !/\p{Cc}/u.test(value), 'No se permiten caracteres de control.'),
  ),
})

export type Department = v.InferOutput<typeof departmentSchema>
export type CreateDepartment = v.InferInput<typeof createDepartmentSchema>

export const departments = {
  async mine(): Promise<Department | null> {
    const response = await request('/api/departments/me')
    return v.parse(v.nullable(departmentSchema), await response.json())
  },
  async list(): Promise<Department[]> {
    const response = await request('/api/departments')
    return v.parse(v.array(departmentSchema), await response.json())
  },
  async get(id: string): Promise<Department> {
    const response = await request(`/api/departments/${encodeURIComponent(id)}`)
    return v.parse(departmentSchema, await response.json())
  },
  async create(input: CreateDepartment): Promise<Department> {
    const response = await request('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v.parse(createDepartmentSchema, input)),
    })
    return v.parse(departmentSchema, await response.json())
  },
}

export const departmentsListQueryOptions = queryOptions({
  queryKey: ['departments', 'list'] as const,
  queryFn: departments.list,
  staleTime: 300_000,
})

export function myDepartmentQueryOptions(publicId: string | null) {
  return queryOptions({
    queryKey: ['departments', 'mine', publicId] as const,
    queryFn: departments.mine,
    enabled: publicId !== null,
    staleTime: 60_000,
  })
}
