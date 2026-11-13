/**
 * HTTP client for the Django REST API.
 *
 * - Development: requests go to `/api/...` and Vite's dev-server proxy forwards
 *   them to http://127.0.0.1:8000 (see vite.config.ts). No CORS involved.
 * - Production: set VITE_API_BASE_URL to your backend origin, e.g.
 *   `VITE_API_BASE_URL=https://api.mastershop.com` in `.env`.
 *
 * JWT handling:
 *   - Access token lives in memory (module variable).
 *   - Refresh token lives in localStorage so a page reload keeps you logged in.
 *   - On a 401 we try ONE refresh, then replay the original request.
 */

export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

const REFRESH_KEY = 'mastershop_refresh_token'

let accessToken: string | null = null
let refreshPromise: Promise<string | null> | null = null

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

export function setTokens(access: string, refresh: string): void {
  accessToken = access
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens(): void {
  accessToken = null
  localStorage.removeItem(REFRESH_KEY)
}

export function hasRefreshToken(): boolean {
  return localStorage.getItem(REFRESH_KEY) !== null
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, data: unknown, message?: string) {
    super(message ?? `Request failed with status ${status}`)
    this.status = status
    this.data = data
  }

  /** DRF validation errors: { field: ["msg"] } → "field: msg, ..." */
  get displayMessage(): string {
    const data = this.data as Record<string, unknown> | string | undefined
    if (!data) return this.message
    if (typeof data === 'string') return data
    if (typeof data === 'object') {
      if ('detail' in data && typeof data.detail === 'string') return data.detail
      const parts: string[] = []
      for (const [field, value] of Object.entries(data)) {
        const msg = Array.isArray(value) ? value.join(', ') : String(value)
        parts.push(`${field.replace(/_/g, ' ')}: ${msg}`)
      }
      return parts.join(' · ')
    }
    return this.message
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Skip the automatic 401-refresh-retry (used by the refresh call itself). */
  noAuthRetry?: boolean
}

async function doFetch<T>(path: string, options: RequestOptions): Promise<T> {
  const { method = 'GET', body } = options

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // 204 No Content
  if (response.status === 204) return undefined as T

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, data)
  }
  return data as T
}

// ---------------------------------------------------------------------------
// Refresh logic
// ---------------------------------------------------------------------------

async function requestNewAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) return null

  try {
    const data = await doFetch<{ access: string }>('/api/auth/token/refresh/', {
      method: 'POST',
      body: { refresh },
      noAuthRetry: true,
    })
    accessToken = data.access
    return accessToken
  } catch {
    // Refresh token expired/revoked — full logout.
    clearTokens()
    return null
  }
}

async function requestWithRefresh<T>(
  path: string,
  options: RequestOptions,
): Promise<T> {
  try {
    return await doFetch<T>(path, options)
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      !options.noAuthRetry &&
      hasRefreshToken()
    ) {
      // De-duplicate concurrent refreshes.
      refreshPromise ??= requestNewAccessToken()
      const newAccess = await refreshPromise
      refreshPromise = null

      if (newAccess) {
        return await doFetch<T>(path, options)
      }
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export const api = {
  get<T>(path: string): Promise<T> {
    return requestWithRefresh<T>(path, { method: 'GET' })
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return requestWithRefresh<T>(path, { method: 'POST', body })
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return requestWithRefresh<T>(path, { method: 'PUT', body })
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return requestWithRefresh<T>(path, { method: 'PATCH', body })
  },
  delete<T>(path: string): Promise<T> {
    return requestWithRefresh<T>(path, { method: 'DELETE' })
  },
}

/** Normalize the three list shapes DRF can give us into a plain array. */
export function extractResults<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: T[] }).results
  }
  return []
}

/** Count from any paginated shape (falls back to array length). */
export function extractCount<T>(data: unknown): number {
  if (Array.isArray(data)) return data.length
  if (
    data &&
    typeof data === 'object' &&
    'total' in data &&
    typeof (data as { total: unknown }).total === 'number'
  ) {
    return (data as { total: number }).total
  }
  if (
    data &&
    typeof data === 'object' &&
    'count' in data &&
    typeof (data as { count: unknown }).count === 'number'
  ) {
    return (data as { count: number }).count
  }
  return extractResults<T>(data).length
}
