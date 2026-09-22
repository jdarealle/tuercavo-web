import assert from 'node:assert/strict'
import { createServer } from 'vite'
import * as v from 'valibot'

const server = await createServer({ configFile: false, envDir: '/tmp/tuercavo-modules-contract-empty-env', optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
const originalFetch = globalThis.fetch

try {
  const catalog = await server.ssrLoadModule('/src/api/catalog.ts')
  const access = await server.ssrLoadModule('/src/api/users.ts')
  const uuid = '11111111-1111-4111-8111-111111111111'
  const supplier = { code: 'PROV-1', name: 'Proveedor', contact_name: null, email: null, phone: null, status: 'active' }
  const user = { entra_tenant_id: uuid, entra_object_id: '22222222-2222-4222-8222-222222222222', email: 'usuario@example.com', full_name: 'Usuario', role: 'consultor' }
  const accepts = (schema, input) => assert.equal(v.safeParse(schema, input).success, true, JSON.stringify(input))
  const rejects = (schema, input) => assert.equal(v.safeParse(schema, input).success, false, JSON.stringify(input))

  accepts(catalog.createSupplierSchema, supplier)
  accepts(catalog.createSupplierSchema, { ...supplier, email: 'contacto@example.com', phone: '+52 (664) 123-4567 x89' })
  rejects(catalog.createSupplierSchema, { ...supplier, code: '-invalido' })
  rejects(catalog.createSupplierSchema, { ...supplier, contact_name: '' })
  rejects(catalog.createSupplierSchema, { ...supplier, phone: 'sin-digitos' })
  accepts(catalog.updateSupplierSchema, { phone: null })
  rejects(catalog.updateSupplierSchema, { name: null })

  accepts(access.createUserSchema, user)
  rejects(access.createUserSchema, { ...user, entra_object_id: '00000000-0000-0000-0000-000000000000' })
  rejects(access.createUserSchema, { ...user, role: 'superadmin' })
  rejects(access.createUserSchema, { ...user, email: 'correo inválido' })
  accepts(access.updateUserSchema, { email: user.email, full_name: user.full_name, is_active: false })
  rejects(access.updateUserSchema, { email: user.email, full_name: '', is_active: true })

  const calls = []
  globalThis.fetch = async (path, init) => {
    calls.push({ path, method: init.method, body: init.body ? JSON.parse(init.body) : null })
    if (init.method === 'DELETE') return new Response(null, { status: 204 })
    const response = path.startsWith('/api/suppliers') ? { public_id: uuid, ...supplier, created_at: '2026-09-21T00:00:00Z', updated_at: '2026-09-21T00:00:00Z' }
      : { public_id: uuid, ...user, is_active: true, created_at: '2026-09-21T00:00:00Z', updated_at: '2026-09-21T00:00:00Z' }
    if (init.method === 'PUT') response.role = 'admin'
    return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  await catalog.suppliers.create(supplier)
  await catalog.suppliers.update(uuid, { phone: null })
  await catalog.suppliers.remove(uuid)
  await access.users.create(user)
  await access.users.update(uuid, { is_active: false })
  await access.users.assignRole(uuid, 'admin')
  assert.deepEqual(calls.map(({ path, method }) => [method, path]), [
    ['POST', '/api/suppliers'], ['PATCH', `/api/suppliers/${uuid}`], ['DELETE', `/api/suppliers/${uuid}`],
    ['POST', '/api/users'], ['PATCH', `/api/users/${uuid}`], ['PUT', `/api/users/${uuid}/role`],
  ])
  assert.deepEqual(calls[1].body, { phone: null })
  assert.deepEqual(calls[3].body, user)
  assert.deepEqual(calls[4].body, { is_active: false })
  assert.deepEqual(calls[5].body, { role: 'admin' })
  process.stdout.write('Contrato de proveedores, usuarios y roles: OK\n')
} finally {
  globalThis.fetch = originalFetch
  await server.close()
}
