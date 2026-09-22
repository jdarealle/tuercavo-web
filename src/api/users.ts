import * as v from 'valibot'
import { request } from './auth'

const uuid = v.pipe(v.string(), v.uuid('Introduce un UUID válido.'))
const nonNilUuid = v.pipe(uuid, v.check((value) => value.toLowerCase() !== '00000000-0000-0000-0000-000000000000', 'El UUID no puede estar vacío.'))
const text = v.pipe(v.string(), v.trim(), v.nonEmpty('Este campo es obligatorio.'), v.maxLength(150, 'Máximo 150 caracteres.'), v.check((value) => !/\p{Cc}/u.test(value), 'No se permiten caracteres de control.'))
const email = v.pipe(v.string(), v.trim(), v.nonEmpty('El correo es obligatorio.'), v.maxLength(254, 'Máximo 254 caracteres.'), v.email('Introduce un correo válido.'), v.check((value) => !/\s/u.test(value), 'El correo no admite espacios.'))
export const roleCodeSchema = v.picklist(['admin', 'capturista', 'consultor'])

export const userSchema = v.object({
  public_id: uuid,
  entra_tenant_id: uuid,
  entra_object_id: uuid,
  email: v.string(),
  full_name: v.string(),
  role: v.string(),
  is_active: v.boolean(),
  created_at: v.string(),
  updated_at: v.string(),
})
const roleSchema = v.object({ code: v.string(), name: v.string() })
const permissionSchema = v.object({ code: v.string(), description: v.string() })
const pageSchema = v.object({
  data: v.array(userSchema),
  total: v.number(),
  page: v.number(),
  per_page: v.number(),
  total_pages: v.number(),
})

export const createUserSchema = v.object({ entra_tenant_id: uuid, entra_object_id: nonNilUuid, email, full_name: text, role: roleCodeSchema })
export const updateUserSchema = v.object({ email, full_name: text, is_active: v.boolean() })
export const assignRoleSchema = v.object({ role: roleCodeSchema })

export type User = v.InferOutput<typeof userSchema>
export type Role = v.InferOutput<typeof roleSchema>
export type Permission = v.InferOutput<typeof permissionSchema>
export type RoleCode = v.InferOutput<typeof roleCodeSchema>
export type CreateUser = v.InferInput<typeof createUserSchema>
export type UpdateUser = v.InferInput<typeof updateUserSchema>

async function json<T extends v.GenericSchema>(path: string, schema: T, init?: RequestInit): Promise<v.InferOutput<T>> {
  const response = await request(path, init)
  return v.parse(schema, await response.json())
}

function body(method: 'POST' | 'PATCH' | 'PUT', value: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }
}

export const users = {
  list: (page = 1) => json(`/api/users?page=${page}&per_page=20`, pageSchema),
  get: (id: string) => json(`/api/users/${encodeURIComponent(id)}`, userSchema),
  create: (input: CreateUser) => json('/api/users', userSchema, body('POST', v.parse(createUserSchema, input))),
  update: (id: string, input: Partial<UpdateUser>) => json(`/api/users/${encodeURIComponent(id)}`, userSchema, body('PATCH', v.parse(v.partial(updateUserSchema), input))),
  assignRole: (id: string, role: RoleCode) => json(`/api/users/${encodeURIComponent(id)}/role`, userSchema, body('PUT', v.parse(assignRoleSchema, { role }))),
}

export const roles = { list: () => json('/api/roles', v.array(roleSchema)) }
export const permissions = { list: () => json('/api/permissions', v.array(permissionSchema)) }
