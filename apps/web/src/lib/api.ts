// Small fetch wrapper for the BookLeaf API. Requests go to /api on this
// origin (proxied to Express), and the httpOnly session cookie rides along.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { field: string; message: string }[],
  ) {
    super(message);
  }

  // Field errors keyed by field name, for showing next to form inputs.
  fieldErrors(): Record<string, string> {
    return Object.fromEntries((this.details ?? []).map((detail) => [detail.field, detail.message]));
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Session expired mid-use: send them back to log in. A full page load
    // (rather than router.push) also clears any cached data from the session.
    if (res.status === 401 && !path.startsWith("/auth/login") && typeof window !== "undefined") {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    const error = data?.error ?? {};
    throw new ApiError(res.status, error.code ?? "UNKNOWN", error.message ?? "Something went wrong.", error.details);
  }

  return data as T;
}

// SWR fetcher: the cache key is the API path.
export const fetcher = <T,>(path: string) => api<T>(path);
