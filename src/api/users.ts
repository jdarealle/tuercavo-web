import * as v from 'valibot'
import { request } from './auth'

const uuid = v.pipe(v.string(), v.uuid('Introduce un UUID válido.'))
export const roleCodeSchema = v.picklist(['admin', 'capturista', 'consultor'])

export const userSchema = v.object({
  public_id: uuid,
  entra_tenant_id: uuid,
  entra_object_id: uuid,
  email: v.nullable(v.string()),
  full_name: v.nullable(v.string()),
  role: roleCodeSchema,
  is_active: v.boolean(),
  created_at: v.string(),
  updated_at: v.string(),
})
const roleSchema = v.object({ code: roleCodeSchema, name: v.string() })
const permissionSchema = v.object({ code: v.string(), description: v.string() })
const pageSchema = v.object({
  data: v.array(userSchema),
  total: v.number(),
  page: v.number(),
  per_page: v.number(),
  total_pages: v.number(),
})

export const updateUserSchema = v.object({ is_active: v.boolean() })

export type User = v.InferOutput<typeof userSchema>
export type Role = v.InferOutput<typeof roleSchema>
export type Permission = v.InferOutput<typeof permissionSchema>
export type UpdateUser = v.InferInput<typeof updateUserSchema>

async function json<T extends v.GenericSchema>(path: string, schema: T, init?: RequestInit): Promise<v.InferOutput<T>> {
  const response = await request(path, init)
  return v.parse(schema, await response.json())
}

function body(value: unknown): RequestInit {
  return { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }
}

export const users = {
  list: (page = 1) => json(`/api/users?page=${page}&per_page=20`, pageSchema),
  get: (id: string) => json(`/api/users/${encodeURIComponent(id)}`, userSchema),
  update: (id: string, input: UpdateUser) => json(`/api/users/${encodeURIComponent(id)}`, userSchema, body(v.parse(updateUserSchema, input))),
}

export const roles = { list: () => json('/api/roles', v.array(roleSchema)) }
export const permissions = { list: () => json('/api/permissions', v.array(permissionSchema)) }
