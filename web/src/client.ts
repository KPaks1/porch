const BASE = import.meta.env.VITE_API_URL ?? ''
const VERSION = import.meta.env.VITE_API_VERSION ?? 'v1'

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Options = { versioned?: boolean; body?: unknown } & Omit<RequestInit, 'body'>

export async function apiFetch<T>(path: string, { versioned = true, body, ...init }: Options = {}): Promise<T> {
  const url = versioned ? `${BASE}/${VERSION}${path}` : `${BASE}${path}`

  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new ApiError(res.status, err?.message ?? res.statusText)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}
