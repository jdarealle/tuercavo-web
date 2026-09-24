# Tuercavo Web

SPA para administrar el catálogo y el acceso de Tuercavo. Consume la API REST de Tuercavo bajo el mismo origen mediante el prefijo `/api`.

## Tecnologías

- React 19 y TypeScript
- Vite
- TanStack Router
- TanStack Query
- Valibot
- shadcn/ui con Base UI
- Tailwind CSS

## Requisitos

- Node.js compatible con las dependencias declaradas en `package.json`
- pnpm
- `tuercavo-api` configurada con PostgreSQL y Microsoft Entra ID
- Un App Role reconocido por la API asignado al usuario en Entra

## Configuración

Vite reenvía las solicitudes `/api/*` a `API_PROXY_TARGET`. El destino predeterminado es `http://localhost:3000`.

```env
API_PROXY_TARGET=http://localhost:3001
```

La SPA y la API deben exponerse bajo el mismo origen para utilizar la cookie de sesión HttpOnly. En desarrollo, la configuración esperada en la API es:

```env
OIDC_REDIRECT_URI=http://localhost:5173/api/auth/callback
POST_LOGIN_REDIRECT_PATH=/
POST_LOGOUT_REDIRECT_URI=http://localhost:5173/login
```

Las URI deben estar registradas como Redirect URI de tipo **Web** en Microsoft Entra.

## Desarrollo

```sh
pnpm install
pnpm dev
```

La aplicación se sirve normalmente en `http://localhost:5173`.

## Autenticación

- `/login` inicia el flujo OIDC mediante `GET /api/auth/login?prompt=select_account`.
- Las rutas privadas consultan `GET /api/auth/me`.
- Un `401` redirige a `/login`.
- Los errores de red, del servidor o del contrato permiten reintentar la consulta de sesión.
- El cierre de sesión ejecuta `POST /api/auth/logout` y continúa en `GET /api/auth/entra-logout`.
- `/signed-out` redirige a `/login`.

La API administra el callback OIDC, la sesión, la cookie HttpOnly y la sincronización del usuario y su App Role de Entra. La SPA conserva la sesión consultada en TanStack Query y valida las respuestas con Valibot.

## Rutas

| Ruta | Función |
| --- | --- |
| `/` | Dashboard con totales y productos recientes. |
| `/categories` | Consulta, búsqueda, creación, edición y eliminación de categorías. |
| `/products` | Consulta, filtros, creación, edición y eliminación de productos. |
| `/suppliers` | Consulta, búsqueda, creación, edición y eliminación de proveedores. |
| `/users` | Consulta de usuarios y activación o desactivación del acceso local. |
| `/roles` | Consulta de roles reconocidos por la API. |
| `/permissions` | Consulta de permisos. |
| `/health` | Estado de la API y su conexión con la base de datos. |
| `/login` | Acceso mediante Microsoft Entra ID. |

La navegación y las acciones disponibles dependen de los permisos entregados por `/api/auth/me`. La API realiza la autorización definitiva de cada operación.

## Comandos

```sh
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm test:auth
pnpm test:catalog
pnpm test:modules
```

Las pruebas validan los contratos de sesión, catálogo, proveedores y acceso local de usuarios.
