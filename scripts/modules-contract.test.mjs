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
  const user = { public_id: uuid, entra_tenant_id: uuid, entra_object_id: '22222222-2222-4222-8222-222222222222', email: null, full_name: null, role: 'consultor', is_active: true, created_at: '2026-09-21T00:00:00Z', updated_at: '2026-09-21T00:00:00Z' }
  const accepts = (schema, input) => assert.equal(v.safeParse(schema, input).success, true, JSON.stringify(input))
  const rejects = (schema, input) => assert.equal(v.safeParse(schema, input).success, false, JSON.stringify(input))

  accepts(catalog.createSupplierSchema, supplier)
  accepts(catalog.createSupplierSchema, { ...supplier, email: 'contacto@example.com', phone: '+52 (664) 123-4567 x89' })
  rejects(catalog.createSupplierSchema, { ...supplier, code: '-invalido' })
  rejects(catalog.createSupplierSchema, { ...supplier, contact_name: '' })
  rejects(catalog.createSupplierSchema, { ...supplier, phone: 'sin-digitos' })
  accepts(catalog.updateSupplierSchema, { phone: null })
  rejects(catalog.updateSupplierSchema, { name: null })

  accepts(access.userSchema, user)
  accepts(access.updateUserSchema, { is_active: false })
  rejects(access.updateUserSchema, {})
  rejects(access.userSchema, { ...user, role: 'superadmin' })

  const calls = []
  globalThis.fetch = async (path, init) => {
    calls.push({ path, method: init.method, body: init.body ? JSON.parse(init.body) : null })
    if (init.method === 'DELETE') return new Response(null, { status: 204 })
    const response = path.startsWith('/api/suppliers') ? { public_id: uuid, ...supplier, created_at: '2026-09-21T00:00:00Z', updated_at: '2026-09-21T00:00:00Z' }
      : { ...user, ...calls.at(-1).body }
    return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  await catalog.suppliers.create(supplier)
  await catalog.suppliers.update(uuid, { phone: null })
  await catalog.suppliers.remove(uuid)
  await access.users.update(uuid, { is_active: false })
  assert.deepEqual(calls.map(({ path, method }) => [method, path]), [
    ['POST', '/api/suppliers'], ['PATCH', `/api/suppliers/${uuid}`], ['DELETE', `/api/suppliers/${uuid}`],
    ['PATCH', `/api/users/${uuid}`],
  ])
  assert.deepEqual(calls[1].body, { phone: null })
  assert.deepEqual(calls[3].body, { is_active: false })
  assert.equal('create' in access.users, false)
  assert.equal('assignRole' in access.users, false)
  process.stdout.write('Contrato de proveedores y acceso local de usuarios: OK\n')
} finally {
  globalThis.fetch = originalFetch
  await server.close()
}
