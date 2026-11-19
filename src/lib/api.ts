"use client";
/** Small fetch helper for client components. Throws with the server's error code. */
export async function api<T = unknown>(url: string, body?: unknown, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    method: body === undefined ? (init.method ?? "GET") : (init.method ?? "POST"),
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `http_${res.status}`);
  return data as T;
}
