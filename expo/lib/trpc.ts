import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }
  throw new Error("No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL");
};

export function getTrpcUrl(): string {
  return `${getBaseUrl()}/api/trpc`;
}

const REQUEST_TIMEOUT_MS = 12000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 800;

function isNetworkError(err: any): boolean {
  return (
    err?.name === "TypeError" &&
    (err?.message === "Failed to fetch" ||
      err?.message?.includes("network") ||
      err?.message?.includes("fetch"))
  );
}

async function fetchWithRetry(
  url: RequestInfo | URL,
  options: RequestInit | undefined,
  requestId: string,
  shouldLog: boolean
): Promise<Response> {
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn(`⏱️ tRPC request timed out after ${REQUEST_TIMEOUT_MS}ms [${requestId}] attempt ${attempt}`);
    }, REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      const isRetryable = isNetworkError(err) || err?.name === "AbortError";

      if (!isRetryable || attempt >= MAX_RETRIES) {
        throw err;
      }

      const delay = RETRY_BASE_DELAY_MS * attempt;
      if (shouldLog) {
        console.warn(
          `⚠️ tRPC fetch failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms... [${requestId}]`,
          err?.message
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: getTrpcUrl(),
      transformer: superjson,
      async fetch(url, options) {
        const shouldLog = process.env.SAFE_MODE_DEBUG === "1" || __DEV__;
        const startTime = Date.now();
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        if (shouldLog) {
          console.log(
            "🔵 tRPC REQUEST",
            requestId,
            url instanceof URL ? url.href : typeof url === "string" ? url : "[URL object]"
          );
        }

        try {
          const response = await fetchWithRetry(url, options, requestId, shouldLog);
          const durationMs = Date.now() - startTime;

          if (shouldLog) {
            console.log(
              "🟢 tRPC RESPONSE",
              requestId,
              "status:",
              response.status,
              "duration:",
              durationMs,
              "ms"
            );
          }

          return response;
        } catch (err: any) {
          const durationMs = Date.now() - startTime;

          if (shouldLog) {
            console.error("🔴 tRPC FETCH ERROR");
            console.error("Request ID:", requestId);
            console.error("Duration:", durationMs, "ms");
            console.error("Error:", err.name, err.message);
            console.error("Stack:", err.stack);
          }

          throw err;
        }
      },
    }),
  ],
});
