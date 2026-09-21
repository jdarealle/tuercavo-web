# Tuercavo Web

SPA de Tuercavo basada en el contrato REST de [`tuercavo-api`](../tuercavo-api/README.md). Incluye autenticación con Microsoft Entra ID, inicio y los módulos de categorías y productos.

## Ejecutar en local

1. Inicia la API según su README. Requiere PostgreSQL, Microsoft Entra ID y al menos un usuario activo registrado. Para volver a la raíz de esta SPA después del callback, configura `POST_LOGIN_REDIRECT_PATH=/` en la API. `OIDC_REDIRECT_URI` debe apuntar a `/api/auth/callback` bajo el mismo origen que sirve la SPA y coincidir exactamente con la URL registrada en Entra; con Vite en local, ese origen es `http://localhost:5173`.
2. Instala las dependencias y arranca la SPA:

   ```sh
   pnpm install
   pnpm dev
   ```

3. Abre la URL `http://localhost` que imprima Vite (normalmente `http://localhost:5173`). Usa **localhost** tanto para Vite como para la API; la cookie de sesión depende del host.

`API_PROXY_TARGET` permite cambiar la dirección de la API para el proxy de desarrollo; el valor predeterminado es `http://localhost:3000`. Si tu API escucha en `3001`, configura `API_PROXY_TARGET=http://localhost:3001` en el `.env` de este proyecto o al iniciar Vite. El proxy envía `/api/*` a ese destino. Reinicia Vite después de cambiar el `.env`. En producción, sirve la SPA y `/api/*` bajo el mismo origen, con un proxy inverso delante de la API.

## Contrato de autenticación

La ruta raíz de TanStack Router protege todas las páginas de la SPA. Consulta `GET /api/auth/me` para obtener `public_id`, `email`, `full_name`, `tenant_id`, `object_id`, `role` y `permissions`. Si no hay sesión o falla la comprobación, el navegador abre directamente `GET /api/auth/login` y el backend inicia Entra ID. No hay pantalla propia de login ni mensaje de error de sesión. Las respuestas se validan con Valibot. TanStack Query conserva la sesión en memoria y la actualiza al volver a la pestaña y periódicamente.

La API controla el callback, la cookie HttpOnly y el regreso mediante `POST_LOGIN_REDIRECT_PATH`. El valor predeterminado de la API es `/api/auth/me`; para esta SPA debe ser `/`. La SPA comprueba la sesión mediante `/api/auth/me`.

El menú lateral permite navegar, cambiar entre tema claro, oscuro o del sistema y cerrar sesión con `POST /api/auth/logout`. Tras recibir `204`, la SPA limpia la sesión en memoria y muestra «Sesión cerrada». La API revoca la sesión local, pero su ruta `/api/auth/login` no solicita un inicio interactivo ni cierra la sesión de Microsoft. Redirigir allí inmediatamente podría crear otra sesión sin pedir credenciales. Al abrir de nuevo una ruta de la SPA, se iniciará el flujo normal de Entra.

## Módulos

- `/categories`: consulta paginada y de detalle, búsqueda, filtro por estado, creación, edición parcial y eliminación de categorías. Los formularios validan las reglas de texto de la API y muestran conflictos de nombre o de referencias en contexto.
- `/products`: consulta paginada y de detalle, búsqueda, filtros por estado, categoría y proveedor, creación, edición parcial y eliminación de productos. Los formularios validan SKU, precio y textos; permiten seleccionar categorías y proveedores activos o introducir sus UUID si no está disponible la lista.

La interfaz utiliza los componentes generados de shadcn/ui con Base UI, sin modificar sus archivos base. Los botones y acciones se muestran según los permisos que devuelve `/api/auth/me`; la API conserva la validación y autorización definitivas. La API no ofrece un recurso `GET /`; sus rutas REST comienzan por `/api`.

## Verificación

```sh
pnpm lint
pnpm build
pnpm test:catalog
```

Para probar los componentes en un navegador con `playwright-cli`, inicia `pnpm dev` en otra terminal y ejecuta:

```sh
playwright-cli open about:blank --browser firefox
playwright-cli run-code --filename=scripts/component-smoke.js
playwright-cli close
```

La prueba intercepta `/api/*` con datos locales y recorre sidebar, tema, navegación, tablas, búsqueda, paginación, formularios, Select, Dialog, Sheet, menús, confirmaciones y cierre de sesión. No modifica la API. Si Firefox no está instalado para la versión local de `playwright-cli`, ejecuta `playwright-cli install-browser firefox` primero.
