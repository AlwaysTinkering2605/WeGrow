import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Overloaded signatures for apiRequest
export async function apiRequest(
  methodOrUrl: string,
  urlOrOptions?: string | {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  },
  data?: any
): Promise<Response> {
  let url: string;
  let method: string;
  let body: string | undefined;
  let headers: Record<string, string> | undefined;

  // Check if first parameter is a method (POST, GET, etc.)
  if (methodOrUrl.match(/^(GET|POST|PUT|PATCH|DELETE)$/i) && typeof urlOrOptions === 'string') {
    // New style: apiRequest("POST", "/api/...", data)
    method = methodOrUrl;
    url = urlOrOptions;
    body = data !== undefined ? JSON.stringify(data) : undefined;
  } else {
    // Old style: apiRequest("/api/...", { method, body, headers })
    url = methodOrUrl;
    const options = urlOrOptions as { method?: string; body?: string; headers?: Record<string, string>; } | undefined;
    method = options?.method || 'GET';
    body = options?.body;
    headers = options?.headers;
  }

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: (query) => {
        // Auth data should refetch frequently to detect login/logout changes
        if (query.queryKey[0] === '/api/auth/user') {
          return 1000 * 10; // 10 seconds for auth data to allow quick state changes
        }
        return Infinity; // Keep other queries cached indefinitely
      },
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
