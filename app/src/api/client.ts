const BASE = 'http://localhost:4000'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, params?: Record<string, string | string[]>): Promise<T> {
  const url = new URL(path, BASE)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, v))
      } else if (value !== '') {
        url.searchParams.set(key, value)
      }
    }
  }

  const res = await fetch(url.toString())

  if (!res.ok) {
    throw new ApiError(res.status, `API error ${res.status}: ${res.statusText}`)
  }

  return res.json() as Promise<T>
}
