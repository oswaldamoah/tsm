// Shared API + session helpers.

// Defaults to the deployed backend. Point it somewhere else for local work by
// putting VITE_API_BASE_URL=http://127.0.0.1:8000 in a .env.local file.
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'https://tsm-backend-hhao.onrender.com'

export type UserRole = 'admin' | 'manager'

export type AuthUser = {
  username: string
  email: string
  role: UserRole
}

export type TokenResponse = {
  access_token: string
  token_type: string
  username: string
  email?: string | null
  role: string
}

const KEYS = {
  TOKEN: 'auth_token',
  USERNAME: 'auth_username',
  EMAIL: 'auth_email',
  ROLE: 'auth_role',
} as const

export const UNAUTHORIZED_EVENT = 'tsm:unauthorized'

function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function normalizeRole(role: string | null | undefined): UserRole | null {
  const value = (role ?? '').toLowerCase()
  return value === 'admin' || value === 'manager' ? value : null
}

export function getToken(): string | null {
  return safeStorage()?.getItem(KEYS.TOKEN) ?? null
}

export function getStoredAuth(): AuthUser | null {
  const store = safeStorage()
  if (!store) return null
  const token = store.getItem(KEYS.TOKEN)
  const username = store.getItem(KEYS.USERNAME)
  const role = normalizeRole(store.getItem(KEYS.ROLE))
  if (!token || !username || !role) return null
  return { username, email: store.getItem(KEYS.EMAIL) ?? '', role }
}

export function storeSession(data: TokenResponse): AuthUser {
  const role = normalizeRole(data.role) ?? 'manager'
  const user: AuthUser = { username: data.username, email: data.email ?? '', role }
  const store = safeStorage()
  if (store) {
    store.setItem(KEYS.TOKEN, data.access_token)
    store.setItem(KEYS.USERNAME, user.username)
    store.setItem(KEYS.EMAIL, user.email)
    store.setItem(KEYS.ROLE, user.role)
  }
  return user
}

export function clearSession() {
  const store = safeStorage()
  if (!store) return
  Object.values(KEYS).forEach((key) => store.removeItem(key))
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Pull a human-readable message out of a FastAPI error body. */
async function readError(response: Response): Promise<string> {
  const text = await response.text().catch(() => '')
  if (!text) return `Request failed (${response.status}).`
  try {
    const body = JSON.parse(text) as { detail?: unknown }
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail) && body.detail.length > 0) {
      const first = body.detail[0] as { msg?: string }
      if (first?.msg) return first.msg
    }
  } catch {
    // not JSON
  }
  return text.slice(0, 300)
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0)
  }

  if (!response.ok) {
    const message = await readError(response)
    if (response.status === 401 && token) {
      clearSession()
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: message }))
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** Fire-and-forget request that wakes a sleeping free-tier server. */
export function warmUpServer() {
  fetch(`${API_BASE_URL}/healthz`, { cache: 'no-store' }).catch(() => undefined)
}

// ---- Auth endpoints ----

export const authApi = {
  config: () => request<{ signupEnabled: boolean }>('/auth/config'),
  login: (email: string, password: string) =>
    request<TokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (body: { email: string; username: string; password: string; accessCode: string }) =>
    request<TokenResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    request<TokenResponse>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
}

// ---- Tiny local cache so the dashboard paints instantly on return visits ----

const CACHE_PREFIX = 'tsm_cache_v1:'

export function readCache<T>(key: string): T | null {
  try {
    const raw = safeStorage()?.getItem(CACHE_PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeCache(key: string, value: unknown) {
  try {
    safeStorage()?.setItem(CACHE_PREFIX + key, JSON.stringify(value))
  } catch {
    // storage full or blocked - caching is best-effort
  }
}

export function clearCache() {
  const store = safeStorage()
  if (!store) return
  try {
    Object.keys(store)
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .forEach((key) => store.removeItem(key))
  } catch {
    // ignore
  }
}
