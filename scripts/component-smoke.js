(() => async (page) => {
  const origin = 'http://localhost:5173'
  const categoryId = '11111111-1111-4111-8111-111111111111'
  const supplierId = '22222222-2222-4222-8222-222222222222'
  const now = '2026-09-21T12:00:00Z'
  const principal = {
    public_id: '33333333-3333-4333-8333-333333333333',
    email: 'tester@example.com',
    full_name: 'Usuario de prueba',
    tenant_id: '44444444-4444-4444-8444-444444444444',
    object_id: '55555555-5555-4555-8555-555555555555',
    role: 'admin',
    permissions: [
      'categories.read', 'categories.create', 'categories.update', 'categories.delete',
      'products.read', 'products.create', 'products.update', 'products.delete',
      'suppliers.read',
    ],
  }
  const categories = [{ public_id: categoryId, name: 'Categoría inicial', description: null, status: 'active', created_at: now, updated_at: now }]
  const suppliers = [{ public_id: supplierId, code: 'PROV-1', name: 'Proveedor inicial', status: 'active', created_at: now, updated_at: now }]
  const products = []
  const pageErrors = []
  let productCreateBody = null
  let categoryUpdateBody = null
  let productUpdateBody = null
  let logoutCalls = 0
  let loginCalls = 0
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const respond = (route, data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
  const pageData = (items, params) => {
    const pageNumber = Number(params.page || 1)
    const perPage = Number(params.per_page || 20)
    const search = (params.search || '').toLowerCase()
    const status = params.status
    const category = params.category
    const supplier = params.supplier
    const filtered = items.filter((item) => {
      if (search && !`${item.name} ${item.sku || ''}`.toLowerCase().includes(search)) return false
      if (status && item.status !== status) return false
      if (category && item.category !== category) return false
      if (supplier && item.supplier !== supplier) return false
      return true
    })
    return {
      data: filtered.slice((pageNumber - 1) * perPage, pageNumber * perPage),
      total: filtered.length,
      page: pageNumber,
      per_page: perPage,
      total_pages: Math.ceil(filtered.length / perPage),
    }
  }

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const rawUrl = request.url().replace(/^https?:\/\/[^/]+/, '')
    const pathname = rawUrl.split('?')[0]
    const params = Object.fromEntries((rawUrl.split('?')[1] || '').split('&').filter(Boolean).map((part) => {
      const [key, value] = part.split('=')
      return [decodeURIComponent(key), decodeURIComponent(value || '')]
    }))
    const method = request.method()
    if (pathname === '/api/auth/me' && method === 'GET') return respond(route, principal)
    if (pathname === '/api/auth/logout' && method === 'POST') {
      logoutCalls += 1
      return route.fulfill({ status: 204 })
    }
    if (pathname === '/api/auth/login' && method === 'GET') {
      loginCalls += 1
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Entra ID simulado</h1>' })
    }
    if (pathname === '/api/suppliers' && method === 'GET') return respond(route, pageData(suppliers, params))

    if (pathname === '/api/categories') {
      if (method === 'GET') return respond(route, pageData(categories, params))
      if (method === 'POST') {
        const input = request.postDataJSON()
        const created = { public_id: '66666666-6666-4666-8666-666666666666', ...input, created_at: now, updated_at: now }
        categories.push(created)
        return respond(route, created, 201)
      }
    }
    if (pathname.startsWith('/api/categories/')) {
      const id = pathname.split('/').at(-1)
      const index = categories.findIndex((item) => item.public_id === id)
      if (index < 0) return respond(route, { error: { code: 'not_found', message: 'No existe.' } }, 404)
      if (method === 'PATCH') {
        categoryUpdateBody = request.postDataJSON()
        categories[index] = { ...categories[index], ...categoryUpdateBody, updated_at: now }
        return respond(route, categories[index])
      }
      if (method === 'DELETE') {
        categories.splice(index, 1)
        return route.fulfill({ status: 204 })
      }
      if (method === 'GET') return respond(route, categories[index])
    }

    if (pathname === '/api/products') {
      if (method === 'GET') return respond(route, pageData(products, params))
      if (method === 'POST') {
        productCreateBody = request.postDataJSON()
        const created = { public_id: '77777777-7777-4777-8777-777777777777', ...productCreateBody, created_at: now, updated_at: now }
        products.push(created)
        return respond(route, created, 201)
      }
    }
    if (pathname.startsWith('/api/products/')) {
      const id = pathname.split('/').at(-1)
      const index = products.findIndex((item) => item.public_id === id)
      if (index < 0) return respond(route, { error: { code: 'not_found', message: 'No existe.' } }, 404)
      if (method === 'PATCH') {
        productUpdateBody = request.postDataJSON()
        products[index] = { ...products[index], ...productUpdateBody, updated_at: now }
        return respond(route, products[index])
      }
      if (method === 'DELETE') {
        products.splice(index, 1)
        return route.fulfill({ status: 204 })
      }
      if (method === 'GET') return respond(route, products[index])
    }
    return respond(route, { error: { code: 'unexpected', message: `${method} ${pathname}` } }, 500)
  })

  const check = (condition, message) => { if (!condition) throw new Error(message) }
  await page.goto(origin)
  await page.getByRole('heading', { name: 'Bienvenido, Usuario de prueba' }).waitFor()
  check(await page.getByRole('link', { name: 'Inicio' }).count() === 1, 'Sidebar: falta Inicio')
  await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
  check(await page.locator('[data-slot="sidebar"][data-state="collapsed"]').count() === 1, 'Sidebar: no colapsó')
  await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
  await page.getByRole('button', { name: 'Tema' }).click()
  await page.getByRole('menuitemradio', { name: 'Oscuro' }).click()
  check(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'Tema: no aplicó modo oscuro')

  await page.locator('[data-slot="sidebar"]').getByRole('link', { name: 'Categorías' }).click()
  await page.getByRole('heading', { name: 'Categorías' }).waitFor()
  await page.getByRole('cell', { name: 'Categoría inicial' }).waitFor()
  check(await page.getByRole('button', { name: 'Anterior' }).isDisabled(), 'Paginación: Anterior debería estar deshabilitado')
  await page.getByRole('button', { name: 'Nueva categoría' }).click()
  const categoryDialog = page.getByRole('dialog', { name: 'Nueva categoría' })
  await categoryDialog.waitFor()
  check(await categoryDialog.locator('[data-slot="field-description"]').count() === 0, 'Formulario: las ayudas no deben aparecer de inicio')
  await categoryDialog.locator('label[for="category-name"]').hover()
  await page.getByRole('tooltip').getByText('Hasta 150 caracteres. El nombre debe ser único.').waitFor()
  await categoryDialog.getByRole('button', { name: 'Guardar' }).click()
  await categoryDialog.getByText('Este campo es obligatorio.').waitFor()
  await categoryDialog.getByLabel('Nombre').fill('Categoría de prueba')
  await categoryDialog.getByLabel('Descripción').fill('Línea 1\nLínea 2')
  await categoryDialog.getByRole('button', { name: 'Guardar' }).click()
  await categoryDialog.getByText('No se permiten saltos de línea ni caracteres de control.').waitFor()
  await categoryDialog.getByLabel('Descripción').fill('Descripción de prueba')
  await categoryDialog.locator('#category-status').click()
  await page.getByRole('option', { name: 'Inactivo' }).click()
  await categoryDialog.getByRole('button', { name: 'Guardar' }).click()
  await page.getByRole('cell', { name: 'Categoría de prueba' }).waitFor()
  check(await page.getByRole('cell', { name: 'Inactivo' }).count() >= 1, 'Badge/Select: estado incorrecto')
  await page.getByRole('button', { name: 'Acciones de Categoría de prueba' }).click()
  await page.getByRole('menuitem', { name: 'Ver detalle' }).click()
  await page.getByRole('dialog', { name: 'Detalle de categoría' }).getByRole('cell', { name: 'Descripción de prueba' }).waitFor()
  await page.getByRole('dialog', { name: 'Detalle de categoría' }).getByRole('button', { name: 'Cerrar' }).click()
  await page.getByRole('button', { name: 'Acciones de Categoría de prueba' }).click()
  await page.getByRole('menuitem', { name: 'Editar' }).click()
  const editCategory = page.getByRole('dialog', { name: 'Editar categoría' })
  await editCategory.getByLabel('Nombre').fill('Categoría editada')
  await editCategory.getByRole('button', { name: 'Guardar' }).click()
  await page.getByRole('cell', { name: 'Categoría editada' }).waitFor()
  check(JSON.stringify(categoryUpdateBody) === JSON.stringify({ name: 'Categoría editada' }), 'PATCH categoría: debe enviar solo el nombre modificado')
  await page.getByRole('button', { name: 'Acciones de Categoría editada' }).click()
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  const categoryAlert = page.getByRole('alertdialog', { name: 'Eliminar categoría' })
  await categoryAlert.waitFor()
  await categoryAlert.getByRole('button', { name: 'Eliminar' }).click()
  await page.getByRole('cell', { name: 'Categoría editada' }).waitFor({ state: 'detached' })
  await page.getByRole('textbox', { name: 'Buscar' }).fill('no existe')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByRole('cell', { name: 'No hay categorías para mostrar.' }).waitFor()

  await page.locator('[data-slot="sidebar"]').getByRole('link', { name: 'Productos' }).click()
  await page.getByRole('heading', { name: 'Productos' }).waitFor()
  await page.getByRole('button', { name: 'Nuevo producto' }).click()
  const productSheet = page.getByRole('dialog', { name: 'Nuevo producto' })
  await productSheet.waitFor()
  await productSheet.locator('label[for="product-price"]').hover()
  await page.getByRole('tooltip').getByText('De 0 a 9999999999.99. Usa punto decimal y hasta dos decimales.').waitFor()
  await productSheet.getByRole('button', { name: 'Guardar' }).click()
  await productSheet.getByText('El SKU es obligatorio.').waitFor()
  await productSheet.getByText('El precio es obligatorio.').waitFor()
  await productSheet.getByLabel('SKU').fill('SKU inválido')
  await productSheet.getByLabel('Nombre').fill('Producto de prueba')
  await productSheet.getByLabel('Descripción').fill('Descripción del producto')
  await productSheet.locator('#product-category').click()
  await page.getByRole('option', { name: 'Categoría inicial' }).click()
  await productSheet.locator('#product-supplier').click()
  await page.getByRole('option', { name: 'Proveedor inicial' }).click()
  await productSheet.locator('#product-supplier').click()
  await page.getByRole('option', { name: 'Sin proveedor' }).click()
  await productSheet.locator('#product-unit').click()
  await page.getByRole('option', { name: 'Caja' }).click()
  await productSheet.locator('#product-unit').click()
  await page.getByRole('option', { name: 'Pieza' }).click()
  await productSheet.getByLabel('Precio').fill('125.999')
  await productSheet.getByRole('button', { name: 'Guardar' }).click()
  await productSheet.getByText(/Usa de 1 a 64 caracteres/).waitFor()
  await productSheet.getByText(/Usa un importe entre 0/).waitFor()
  await productSheet.getByLabel('SKU').fill('SKU-PRUEBA')
  await productSheet.getByLabel('Precio').fill('125.50')
  await productSheet.getByRole('button', { name: 'Guardar' }).click()
  await page.getByRole('cell', { name: 'Producto de prueba' }).waitFor()
  check(productCreateBody?.supplier === null, 'Select: Sin proveedor debe enviarse como null')
  await page.getByRole('button', { name: 'Acciones de Producto de prueba' }).click()
  await page.getByRole('menuitem', { name: 'Ver detalle' }).click()
  await page.getByRole('dialog', { name: 'Detalle de producto' }).getByRole('cell', { name: 'SKU-PRUEBA' }).waitFor()
  await page.getByRole('dialog', { name: 'Detalle de producto' }).getByRole('button', { name: 'Cerrar' }).click()
  await page.getByRole('button', { name: 'Acciones de Producto de prueba' }).click()
  await page.getByRole('menuitem', { name: 'Editar' }).click()
  const editProduct = page.getByRole('dialog', { name: 'Editar producto' })
  await editProduct.getByLabel('Precio').fill('150.00')
  await editProduct.getByRole('button', { name: 'Guardar' }).click()
  await page.getByRole('cell', { name: '150.00' }).waitFor()
  check(JSON.stringify(productUpdateBody) === JSON.stringify({ price: '150.00' }), 'PATCH producto: debe enviar solo el precio modificado')
  await page.getByRole('button', { name: 'Acciones de Producto de prueba' }).click()
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  const productAlert = page.getByRole('alertdialog', { name: 'Eliminar producto' })
  await productAlert.getByRole('button', { name: 'Eliminar' }).click()
  await page.getByRole('cell', { name: 'No hay productos para mostrar.' }).waitFor()

  check(pageErrors.length === 0, `Errores de navegador: ${pageErrors.join('; ')}`)
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await page.getByRole('heading', { name: 'Sesión cerrada' }).waitFor()
  check(logoutCalls === 1, 'Logout: debe enviar una petición POST a la API')
  check(loginCalls === 0, 'Logout: no debe iniciar otra sesión automáticamente')
  return 'OK: Sidebar, tema, navegación, tabla, badge, filtros, paginación, formularios, Select, Dialog, Sheet, DropdownMenu, AlertDialog y logout'
})()
