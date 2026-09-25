# Tuercavo Web

SPA en React y TypeScript para los módulos de catálogo y administración de Tuercavo. Usa TanStack Router para las rutas, TanStack Query para los datos, Valibot para validar respuestas y shadcn/ui con Base UI para la interfaz.

## Desarrollo

Se necesita Node.js compatible con `package.json`, pnpm y la API de Tuercavo configurada con Microsoft Entra ID.

```sh
pnpm install
pnpm dev
```

Vite sirve la SPA en `http://localhost:5173` y reenvía `/api/*` al destino indicado por `API_PROXY_TARGET`. Si no se configura, usa `http://localhost:3000`. Para una API en otro puerto, define la variable en `.env.development.local`, por ejemplo:

```env
API_PROXY_TARGET=http://localhost:3001
```

## Integración con la API

La SPA hace solicitudes relativas a `/api` con la cookie de sesión del mismo origen. En desarrollo, el callback y los destinos de login y logout de la API deben usar el origen de Vite:

```env
OIDC_REDIRECT_URI=http://localhost:5173/api/auth/callback
POST_LOGIN_REDIRECT_PATH=/
POST_LOGOUT_REDIRECT_URI=http://localhost:5173/login
```

Registra el callback como URI de redirección **Web** en Microsoft Entra. En producción, el servidor que entregue la SPA debe reenviar `/api` a la API bajo el mismo origen; el proxy de Vite no forma parte de los archivos compilados.

`/login` inicia el flujo OIDC de la API. El layout privado consulta `/api/auth/me`: una respuesta `401` lleva a `/login`, mientras que un fallo de red o servidor muestra una opción para reintentar. Al cerrar sesión, la SPA llama a `POST /api/auth/logout` y navega a `/api/auth/entra-logout`; `/signed-out` vuelve a `/login`. La API administra la sesión y autoriza cada operación. El menú y las acciones de la SPA se muestran según los permisos recibidos en `/api/auth/me`.

## Estructura

- `src/routes`: rutas basadas en archivos. `__root.tsx` define el contexto del router; `_authenticated.tsx` protege los módulos. `src/routeTree.gen.ts` es generado por el plugin de TanStack Router y se versiona.
- `src/api`: cliente REST, esquemas Valibot y opciones compartidas de TanStack Query.
- `src/components/ui`: componentes de shadcn/ui con Base UI; `src/components` contiene las composiciones propias de la SPA.

Las URL de los módulos se definen en `src/routes`.

## Verificación

```sh
pnpm build
pnpm lint
```
