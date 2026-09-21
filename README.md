# Tuercavo Web

SPA de Tuercavo. La primera etapa implementa el acceso al inicio (`/`) mediante el contrato de autenticación de [`tuercavo-api`](../tuercavo-api/README.md).

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

La ruta raíz de TanStack Router protege todas las páginas de la SPA. Consulta `GET /api/auth/me` para obtener `public_id`, `email`, `full_name`, `tenant_id`, `object_id`, `role` y `permissions`. Si no hay sesión o falla la comprobación, el navegador abre directamente `GET /api/auth/login` y el backend inicia Entra ID. No hay pantalla propia de login ni mensaje de error de sesión. Las respuestas se validan con Valibot. TanStack Query conserva la sesión en memoria y la actualiza al volver a la pestaña y periódicamente mientras se muestra el inicio.

La API controla el callback, la cookie HttpOnly y el regreso mediante `POST_LOGIN_REDIRECT_PATH`. El valor predeterminado de la API es `/api/auth/me`; para esta SPA debe ser `/`. La SPA comprueba la sesión mediante `/api/auth/me`.

La ruta `/` de la SPA muestra un JSON básico de bienvenida con los datos del usuario. La API no ofrece un recurso `GET /`; sus rutas REST comienzan por `/api`.

## Verificación

```sh
pnpm lint
pnpm build
```
