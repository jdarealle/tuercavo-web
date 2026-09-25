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
- Una cuenta asignada a la aplicación empresarial en Microsoft Entra

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

La API administra el callback OIDC, la sesión y la cookie HttpOnly. En el primer login crea al usuario con el rol local `consultor`; los siguientes logins conservan el rol asignado en Tuercavo. El primer administrador se promueve mediante el comando operativo `bootstrap-admin` de la API después de su primer login y debe volver a iniciar sesión. La SPA conserva la sesión consultada en TanStack Query y valida las respuestas con Valibot.

## Rutas

| Ruta | Función |
| --- | --- |
| `/` | Dashboard con totales y productos recientes. |
| `/categories` | Consulta, búsqueda, creación, edición y eliminación de categorías. |
| `/products` | Consulta, filtros, creación, edición y eliminación de productos. |
| `/suppliers` | Consulta, búsqueda, creación, edición y eliminación de proveedores. |
| `/departments` | Consulta y creación de departamentos para administradores. |
| `/users` | Consulta de usuarios, asignación de roles y departamentos locales, desactivación con revocación de sesiones y reactivación del acceso local. |
| `/roles` | Consulta, creación, cambio de nombre, retiro, reactivación y administración de permisos de roles. |
| `/permissions` | Consulta de permisos. |
| `/health` | Estado de la API y su conexión con la base de datos. |
| `/login` | Acceso mediante Microsoft Entra ID. |

La navegación y las acciones disponibles dependen de los permisos entregados por `/api/auth/me`. La API realiza la autorización definitiva de cada operación.

El sidebar muestra el nombre del departamento propio bajo «Tuercavo» y la vista Cuenta lo incluye junto con su UUID. Ambos consultan `GET /api/departments/me`, disponible para cualquier usuario autenticado y con respuesta `null` cuando no hay asignación. En el listado y detalle de usuarios, un administrador resuelve el nombre mediante las consultas administrativas de departamentos; la API no permite consultar los departamentos ajenos a otros roles. Después de cambiar el departamento propio, la SPA actualiza la sesión y la consulta del departamento.

Las acciones de acceso local usan `POST /api/users/{public_id}/deactivate` y `POST /api/users/{public_id}/reactivate`, sin cuerpo, con el permiso `users.update`. Después de desactivar a una persona, se retira su acceso a la aplicación en Entra. Para reactivarla, primero se restablece ese acceso en Entra; deberá iniciar sesión de nuevo. La API impide desactivar o cambiar el rol del último administrador activo.

`PUT /api/users/{public_id}/role` asigna un rol local activo con `users.assign_role` y revoca las sesiones del usuario si cambia. `/api/roles` permite listar y crear roles; `/api/roles/{code}` permite consultarlos, renombrarlos, retirarlos y reactivarlos. `PUT /api/roles/{code}/permissions` reemplaza su conjunto completo de permisos. Roles y permisos son globales: una reducción revoca las sesiones de todos los usuarios de ese rol. `admin` y `consultor` son roles del sistema que permanecen activos; para retirar un rol personalizado primero se deben reasignar todos sus usuarios.

`GET /api/departments` y `GET /api/departments/{public_id}` requieren `departments.read`; `POST /api/departments` requiere `departments.create`. `PUT /api/users/{public_id}/department` requiere `users.assign_department` y envía `department_public_id` con un UUID o `null` para quitar la asignación. Estas operaciones exigen además el rol local `admin`; los tres permisos de departamentos no se pueden conceder a otros roles. La asignación no cambia el rol ni revoca sesiones.

## Comandos

```sh
pnpm dev
pnpm build
pnpm preview
pnpm lint
```
