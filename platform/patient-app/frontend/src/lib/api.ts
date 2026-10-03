export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001';

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  accessToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (!response.ok) {
    let errorBody: { code?: string; message?: string; details?: unknown } = {};
    try {
      errorBody = await response.json();
    } catch {
      // non-JSON error body — use defaults
    }
    throw new ApiError(
      response.status,
      errorBody.code ?? 'UNKNOWN_ERROR',
      errorBody.message ?? `Request failed with status ${response.status}`,
      errorBody.details
    );
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get<T>(path: string, accessToken?: string): Promise<T> {
    return request<T>('GET', path, undefined, accessToken);
  },
  post<T>(path: string, body: unknown, accessToken?: string): Promise<T> {
    return request<T>('POST', path, body, accessToken);
  },
  patch<T>(path: string, body: unknown, accessToken?: string): Promise<T> {
    return request<T>('PATCH', path, body, accessToken);
  },
  delete<T>(path: string, accessToken?: string): Promise<T> {
    return request<T>('DELETE', path, undefined, accessToken);
  },
};
