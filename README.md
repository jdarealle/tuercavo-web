# Tuercavo Web

SPA de Tuercavo basada en el contrato REST de [`tuercavo-api`](../tuercavo-api/README.md). Incluye autenticación con Microsoft Entra ID y vistas para los recursos de la API.

## Ejecutar en local

1. Inicia la API según su README. Requiere PostgreSQL, Microsoft Entra ID y al menos un usuario activo registrado. Para volver al inicio autenticado después del callback, configura `POST_LOGIN_REDIRECT_PATH=/` en la API. `OIDC_REDIRECT_URI` debe apuntar a `/api/auth/callback` bajo el mismo origen que sirve la SPA y coincidir exactamente con la URL registrada en Entra; con Vite en local, ese origen es `http://localhost:5173`. Para regresar a la vista de login después del cierre de sesión de Entra, configura `POST_LOGOUT_REDIRECT_URI=http://localhost:5173/login` en la API y registra esa URL exacta como otra Redirect URI **Web** en Entra. Si ya registraste `/signed-out`, esa ruta pública redirige a `/login`.
2. Instala las dependencias y arranca la SPA:

   ```sh
   pnpm install
   pnpm dev
   ```

3. Abre la URL `http://localhost` que imprima Vite (normalmente `http://localhost:5173`). Usa **localhost** tanto para Vite como para la API; la cookie de sesión depende del host.

`API_PROXY_TARGET` permite cambiar la dirección de la API para el proxy de desarrollo; el valor predeterminado es `http://localhost:3000`. Si tu API escucha en `3001`, configura `API_PROXY_TARGET=http://localhost:3001` en el `.env` de este proyecto o al iniciar Vite. El proxy envía `/api/*` a ese destino. Reinicia Vite después de cambiar el `.env`. En producción, sirve la SPA y `/api/*` bajo el mismo origen, con un proxy inverso delante de la API.

## Contrato de autenticación

Un layout protegido de TanStack Router consulta `GET /api/auth/me` para obtener `public_id`, `email`, `full_name`, `tenant_id`, `object_id`, `role` y `permissions`. Solo un `401` indica que no hay sesión y lleva a `/login`. Si falla la red, la API o la validación de la respuesta, se muestra un estado de error con «Reintentar», sin presentar el fallo como un cierre de sesión. La vista `/login` ofrece como única acción «Iniciar sesión con Entra ID», que inicia el flujo del backend mediante `GET /api/auth/login?prompt=select_account`. Ese prompt permite elegir una cuenta, pero no exige volver a escribir la contraseña. `/signed-out` es un alias público que redirige a `/login`; ninguna de estas rutas inicia Entra automáticamente. No hay campos de credenciales propios. Las respuestas se validan con Valibot. TanStack Query conserva la sesión en memoria y la actualiza al volver a la pestaña y periódicamente.

La API controla el callback, la cookie HttpOnly y el regreso mediante `POST_LOGIN_REDIRECT_PATH`. El valor predeterminado de la API es `/api/auth/me`; para esta SPA debe ser `/`. La SPA comprueba la sesión mediante `/api/auth/me`.

El menú lateral permite navegar, cambiar entre tema claro, oscuro o del sistema y cerrar sesión con `POST /api/auth/logout`. Tras recibir `204`, la SPA limpia la sesión en memoria y navega a `GET /api/auth/entra-logout`, que envía el navegador al cierre de sesión de Microsoft. Con `POST_LOGOUT_REDIRECT_URI`, Entra vuelve a la vista `/login`; sin esa configuración, muestra su propia pantalla de salida. El usuario elige cuándo iniciar otra sesión con el botón de Entra.

## Módulos

- `/categories`: consulta paginada y de detalle, búsqueda, filtro por estado, creación, edición parcial y eliminación de categorías. Los formularios validan las reglas de texto de la API y muestran conflictos de nombre o de referencias en contexto.
- `/`: dashboard con totales de productos, categorías, proveedores y usuarios que el usuario puede consultar, además de una tabla con los primeros cinco productos. Los datos provienen de los listados REST; la API no tiene un endpoint de métricas agregado.
- `/products`: consulta paginada y de detalle, búsqueda, filtros por estado, categoría y proveedor, creación, edición parcial y eliminación de productos. Los formularios validan SKU, precio y textos; permiten seleccionar categorías y proveedores activos o introducir sus UUID si no está disponible la lista.
- `/suppliers`: consulta paginada y de detalle, búsqueda, filtro por estado, creación, edición parcial y eliminación. El formulario valida código, nombre y datos de contacto según la API.
- `/users`: consulta paginada y de detalle del tenant actual, registro de identidades de Entra, edición de datos y acceso, y asignación de rol. El tenant se toma de la sesión. La API no ofrece eliminación de usuarios; desactivar revoca sus sesiones y la API protege al último administrador activo.
- `/roles` y `/permissions`: consultas de solo lectura de los catálogos de autorización.
- `/health`: estado del servicio y de su conexión a la base de datos.

La interfaz utiliza los componentes generados de shadcn/ui con Base UI, sin modificar sus archivos base. Los botones y acciones se muestran según los permisos que devuelve `/api/auth/me`; la API conserva la validación y autorización definitivas. La API no ofrece un recurso `GET /`; sus rutas REST comienzan por `/api`.

## Verificación

```sh
pnpm lint
pnpm build
pnpm test:auth
pnpm test:catalog
pnpm test:modules
```

Para probar los componentes en un navegador con `playwright-cli`, inicia `pnpm dev` en otra terminal y ejecuta:

```sh
playwright-cli open about:blank --browser firefox
playwright-cli run-code --filename=scripts/component-smoke.js
playwright-cli close
```

La prueba intercepta `/api/*` con datos locales y recorre sidebar, tema, navegación, tablas, búsqueda, paginación, formularios, Select, Dialog, Sheet, menús, confirmaciones y cierre de sesión. No modifica la API. Si Firefox no está instalado para la versión local de `playwright-cli`, ejecuta `playwright-cli install-browser firefox` primero.
