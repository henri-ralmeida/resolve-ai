const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const sessionKey = 'resolveai.session'

interface StoredSession {
  token: string
}

function token() {
  const raw = localStorage.getItem(sessionKey)
  if (!raw) return undefined
  try {
    return (JSON.parse(raw) as StoredSession).token
  } catch {
    localStorage.removeItem(sessionKey)
    return undefined
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const currentToken = token()
  if (currentToken) headers.set('Authorization', `Bearer ${currentToken}`)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${apiBase}${path}`, { ...options, headers })
  if (!response.ok) {
    let message = `Falha na operação (${response.status}).`
    try {
      const problem = await response.json() as { title?: string; detail?: string; errors?: Record<string, string[]> }
      message = problem.detail ?? problem.title ?? Object.values(problem.errors ?? {}).flat()[0] ?? message
    } catch {
      // Mantém a mensagem HTTP quando a resposta não é JSON.
    }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function assetUrl(path?: string) {
  return path ? `${apiBase}${path}` : undefined
}
