import { queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'

const principalSchema = v.object({
  public_id: v.pipe(v.string(), v.uuid()),
  email: v.pipe(v.string(), v.email()),
  full_name: v.string(),
  tenant_id: v.pipe(v.string(), v.uuid()),
  object_id: v.pipe(v.string(), v.uuid()),
  role: v.string(),
  permissions: v.array(v.string()),
})

const errorSchema = v.object({
  error: v.object({
    code: v.string(),
    message: v.string(),
  }),
})

export type Principal = v.InferOutput<typeof principalSchema>

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(
    status: number,
    code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers,
    signal: init?.signal ?? AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const parsed = v.safeParse(errorSchema, body)
    throw new ApiError(
      response.status,
      parsed.success ? parsed.output.error.code : 'unexpected_response',
      parsed.success ? parsed.output.error.message : 'La API no pudo completar la solicitud.',
    )
  }

  return response
}

export async function getSession(): Promise<Principal | null> {
  try {
    const response = await request('/api/auth/me')
    return v.parse(principalSchema, await response.json())
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export const sessionQueryOptions = queryOptions({
  queryKey: ['auth', 'me'] as const,
  queryFn: getSession,
  staleTime: 10_000,
  retry: false,
})
