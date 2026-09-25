import { queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { request } from './auth'

const uuid = v.pipe(v.string(), v.uuid('Introduce un UUID válido.'))
export const roleCodeSchema = v.pipe(v.string(), v.regex(/^[a-z][a-z0-9_]{0,31}$/, 'Usa hasta 32 caracteres: empieza con a-z y continúa con a-z, 0-9 o _.'))
export const roleNameSchema = v.pipe(v.string(), v.trim(), v.nonEmpty('El nombre es obligatorio.'), v.maxLength(80, 'Máximo 80 caracteres.'), v.check((value) => !/\p{Cc}/u.test(value), 'No se permiten caracteres de control.'))

export const createRoleSchema = v.object({ code: roleCodeSchema, name: roleNameSchema })
export const updateRoleSchema = v.pipe(
  v.partial(v.object({ name: roleNameSchema, is_active: v.boolean() })),
  v.check((value) => value.name !== undefined || value.is_active !== undefined, 'Indica name o is_active.'),
)
export const setPermissionsSchema = v.object({
  permissions: v.pipe(v.array(v.string()), v.check((values) => new Set(values).size === values.length, 'No repitas códigos de permiso.')),
})
export const assignRoleSchema = v.object({ role: roleCodeSchema })
export const assignDepartmentSchema = v.object({ department_public_id: v.nullable(uuid) })

export const userSchema = v.object({
  public_id: uuid,
  entra_tenant_id: uuid,
  entra_object_id: uuid,
  email: v.nullable(v.string()),
  full_name: v.nullable(v.string()),
  role: roleCodeSchema,
  department_public_id: v.nullable(uuid),
  is_active: v.boolean(),
  created_at: v.string(),
  updated_at: v.string(),
})
export const roleSchema = v.object({
  code: roleCodeSchema,
  name: v.string(),
  is_active: v.boolean(),
  is_system: v.boolean(),
  permissions: v.array(v.string()),
})
const permissionSchema = v.object({ code: v.string(), description: v.string() })
const pageSchema = v.object({
  data: v.array(userSchema),
  total: v.number(),
  page: v.number(),
  per_page: v.number(),
  total_pages: v.number(),
})

export type User = v.InferOutput<typeof userSchema>
export type Role = v.InferOutput<typeof roleSchema>
export type Permission = v.InferOutput<typeof permissionSchema>
export type CreateRole = v.InferInput<typeof createRoleSchema>
export type UpdateRole = v.InferInput<typeof updateRoleSchema>
export type SetPermissions = v.InferInput<typeof setPermissionsSchema>

async function json<T extends v.GenericSchema>(path: string, schema: T, init?: RequestInit): Promise<v.InferOutput<T>> {
  const response = await request(path, init)
  return v.parse(schema, await response.json())
}

function jsonBody(method: 'POST' | 'PATCH' | 'PUT', value: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }
}

export const users = {
  list: (page = 1) => json(`/api/users?page=${page}&per_page=20`, pageSchema),
  get: (id: string) => json(`/api/users/${encodeURIComponent(id)}`, userSchema),
  deactivate: (id: string) => json(`/api/users/${encodeURIComponent(id)}/deactivate`, userSchema, { method: 'POST' }),
  reactivate: (id: string) => json(`/api/users/${encodeURIComponent(id)}/reactivate`, userSchema, { method: 'POST' }),
  assignRole: (id: string, role: string) => json(`/api/users/${encodeURIComponent(id)}/role`, userSchema, jsonBody('PUT', v.parse(assignRoleSchema, { role }))),
  assignDepartment: (id: string, department_public_id: string | null) => json(`/api/users/${encodeURIComponent(id)}/department`, userSchema, jsonBody('PUT', v.parse(assignDepartmentSchema, { department_public_id }))),
}

export const roles = {
  list: () => json('/api/roles', v.array(roleSchema)),
  get: (code: string) => json(`/api/roles/${encodeURIComponent(code)}`, roleSchema),
  create: (input: CreateRole) => json('/api/roles', roleSchema, jsonBody('POST', v.parse(createRoleSchema, input))),
  update: (code: string, input: UpdateRole) => json(`/api/roles/${encodeURIComponent(code)}`, roleSchema, jsonBody('PATCH', v.parse(updateRoleSchema, input))),
  setPermissions: (code: string, input: SetPermissions) => json(`/api/roles/${encodeURIComponent(code)}/permissions`, roleSchema, jsonBody('PUT', v.parse(setPermissionsSchema, input))),
}
export const permissions = { list: () => json('/api/permissions', v.array(permissionSchema)) }

export const rolesListQueryOptions = queryOptions({
  queryKey: ['roles', 'list'] as const,
  queryFn: roles.list,
  staleTime: 300_000,
})

export const permissionsListQueryOptions = queryOptions({
  queryKey: ['permissions'] as const,
  queryFn: permissions.list,
  staleTime: 300_000,
})
