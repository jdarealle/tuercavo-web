import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({
  configFile: false,
  envDir: '/tmp/tuercavo-auth-contract-empty-env',
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
})
const originalFetch = globalThis.fetch

try {
  const { ApiError, getSession } = await server.ssrLoadModule('/src/api/auth.ts')
  const principal = {
    public_id: '33333333-3333-4333-8333-333333333333',
    email: 'tester@example.com',
    full_name: 'Usuario de prueba',
    tenant_id: '44444444-4444-4444-8444-444444444444',
    object_id: '55555555-5555-4555-8555-555555555555',
    role: 'admin',
    permissions: ['categories.read'],
  }
  const response = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
  const mock = (result) => {
    globalThis.fetch = async (path, init) => {
      assert.equal(path, '/api/auth/me')
      assert.equal(init.credentials, 'same-origin')
      return result
    }
  }

  mock(response(200, principal))
  assert.deepEqual(await getSession(), principal)

  mock(response(401))
  assert.equal(await getSession(), null)

  mock(response(503, { error: { code: 'unavailable', message: 'Temporalmente no disponible.' } }))
  await assert.rejects(getSession(), (error) => error instanceof ApiError && error.status === 503)

  globalThis.fetch = async () => { throw new TypeError('Sin conexión') }
  await assert.rejects(getSession(), /Sin conexión/)

  mock(response(200, { ...principal, public_id: 'inválido' }))
  await assert.rejects(getSession())

  process.stdout.write('Sesión: 401 sin autenticar; fallos de red, API y contrato conservan el error: OK\n')
} finally {
  globalThis.fetch = originalFetch
  await server.close()
}
