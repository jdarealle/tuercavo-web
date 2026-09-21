import assert from 'node:assert/strict'
import { createServer } from 'vite'
import * as v from 'valibot'

const server = await createServer({ configFile: false, envDir: '/tmp/tuercavo-catalog-contract-empty-env', server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })

try {
  const { createCategorySchema, updateCategorySchema, createProductSchema, updateProductSchema, searchSchema, fieldErrors } = await server.ssrLoadModule('/src/api/catalog.ts')
  const category = { name: 'Herramientas', description: null, status: 'active' }
  const product = {
    sku: 'SKU_1.2',
    name: 'Producto',
    description: null,
    brand: null,
    category: '11111111-1111-4111-8111-111111111111',
    supplier: null,
    unit: 'piece',
    price: '0',
    status: 'active',
  }
  const accepts = (schema, input) => assert.equal(v.safeParse(schema, input).success, true, JSON.stringify(input))
  const rejects = (schema, input) => assert.equal(v.safeParse(schema, input).success, false, JSON.stringify(input))

  accepts(createCategorySchema, category)
  rejects(createCategorySchema, { ...category, name: '' })
  accepts(createCategorySchema, { ...category, name: '😀'.repeat(150) })
  rejects(createCategorySchema, { ...category, name: '😀'.repeat(151) })
  rejects(createCategorySchema, { ...category, description: 'línea 1\nlínea 2' })
  accepts(createCategorySchema, { ...category, description: null })
  accepts(updateCategorySchema, { description: null })
  rejects(updateCategorySchema, { name: null })

  accepts(createProductSchema, product)
  accepts(createProductSchema, { ...product, price: '9999999999.99' })
  rejects(createProductSchema, { ...product, sku: 'SKU inválido' })
  rejects(createProductSchema, { ...product, sku: '-SKU' })
  rejects(createProductSchema, { ...product, price: '-1' })
  rejects(createProductSchema, { ...product, price: '10000000000' })
  rejects(createProductSchema, { ...product, price: '1.999' })
  rejects(createProductSchema, { ...product, category: '' })
  rejects(createProductSchema, { ...product, brand: 'marca\tinválida' })
  const invalidProduct = v.safeParse(createProductSchema, { ...product, sku: '-SKU', price: '1.999' })
  assert.equal(invalidProduct.success, false)
  assert.deepEqual(Object.keys(fieldErrors(invalidProduct.issues)).sort(), ['price', 'sku'])

  accepts(updateProductSchema, { price: '15.50' })
  accepts(updateProductSchema, { description: null, supplier: null })
  rejects(updateProductSchema, { name: null })
  accepts(searchSchema, '')
  rejects(searchSchema, 'búsqueda\ninválida')
  rejects(searchSchema, 'x'.repeat(151))

  process.stdout.write('Contrato de categorías y productos: OK\n')
} finally {
  await server.close()
}
