const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  next_available_at?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly payload?: Record<string, unknown>;

  constructor(message: string, status: number, payload?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('Erro ao conectar ao servidor. Verifique se o backend está rodando.', 0);
  }

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    throw new ApiError(
      json.error ?? 'Erro desconhecido',
      res.status,
      json as unknown as Record<string, unknown>,
    );
  }

  return json.data as T;
}

export function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>('POST', path, { body, token });
}

export function apiGet<T>(path: string, token: string): Promise<T> {
  return request<T>('GET', path, { token });
}
