import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

const EXPECTED_BACKEND_ID = 'indi-backend-hono';

export const trpc = createTRPCReact<AppRouter>();

interface BackendSignature {
  id: string;
  version: string;
  buildTimestamp?: number;
  at: string;
}

let cachedPrefix: string | null = null;
let cacheError: Error | null = null;

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  throw new Error(
    "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL"
  );
};

export async function resolveApiPrefix(baseUrl: string): Promise<string> {
  if (cachedPrefix !== null) {
    console.log('📌 Using cached API prefix:', cachedPrefix);
    return cachedPrefix;
  }

  if (cacheError !== null) {
    throw cacheError;
  }

  console.log('🔍 Resolving API prefix for:', baseUrl);

  const prefixes = ['/api'];

  for (const prefix of prefixes) {
    const whoamiUrl = `${baseUrl}${prefix}/__whoami`;
    console.log(`🔍 Trying: ${whoamiUrl}`);

    try {
      const response = await fetch(whoamiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.log(`❌ ${whoamiUrl} returned ${response.status}`);
        continue;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log(`❌ ${whoamiUrl} não retornou JSON (${contentType})`);
        continue;
      }

      const data: BackendSignature = await response.json();

      if (data.id !== EXPECTED_BACKEND_ID) {
        console.log(`❌ ${whoamiUrl} retornou id errado: ${data.id} (esperado: ${EXPECTED_BACKEND_ID})`);
        continue;
      }

      console.log(`✅ Backend válido encontrado com prefixo: "${prefix}"`);
      console.log(`   ID: ${data.id}`);
      console.log(`   Version: ${data.version}`);
      console.log(`   Build: ${data.buildTimestamp}`);

      cachedPrefix = prefix;
      return prefix;
    } catch (error: any) {
      console.log(`❌ Erro ao tentar ${whoamiUrl}:`, error.message);
    }
  }

  const error = new Error(
    `Backend inválido ou URL errada. ` +
    `O backend não responde em ${baseUrl}/api/__whoami com assinatura válida (id: ${EXPECTED_BACKEND_ID}). ` +
    `Verifique se EXPO_PUBLIC_RORK_API_BASE_URL está correto: ${baseUrl}`
  );
  cacheError = error;
  throw error;
}

export function clearPrefixCache() {
  console.log('🗑️ Clearing API prefix cache');
  cachedPrefix = null;
  cacheError = null;
}

let prefixResolved = false;

export async function ensurePrefixResolved() {
  if (!prefixResolved) {
    const baseUrl = getBaseUrl();
    await resolveApiPrefix(baseUrl);
    prefixResolved = true;
  }
}

export function getTrpcUrl(): string {
  const baseUrl = getBaseUrl();
  if (cachedPrefix === null) {
    console.warn('⚠️ API prefix not resolved yet, using /api as fallback');
    return `${baseUrl}/api/trpc`;
  }
  return `${baseUrl}${cachedPrefix}/trpc`;
}

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: getTrpcUrl(),
      transformer: superjson,
      async fetch(url, options) {
        const shouldLog = process.env.SAFE_MODE_DEBUG === '1' || __DEV__;
        const startTime = Date.now();
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        if (shouldLog) {
          console.log('═══════════════════════════════════════');
          console.log('🔵 tRPC REQUEST');
          console.log('═══════════════════════════════════════');
          console.log('Request ID:', requestId);
          console.log('Timestamp:', new Date().toISOString());
          console.log('Method:', options?.method || 'GET');
          console.log('URL:', url);
          console.log('Headers:', JSON.stringify(options?.headers || {}, null, 2));
          
          if (options?.body) {
            const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
            const truncated = bodyStr.length > 2000 ? bodyStr.substring(0, 2000) + '... [TRUNCATED]' : bodyStr;
            console.log('Body (', bodyStr.length, 'chars):', truncated);
            
            try {
              const parsed = JSON.parse(bodyStr);
              if (parsed.password) {
                console.log('⚠️ Password detected in body (redacted in production)');
              }
            } catch {
              // not JSON, ignore
            }
          }
        }
        
        const enhancedOptions = {
          ...options,
          headers: {
            ...options?.headers,
            ...(shouldLog ? { 'x-debug-request-id': requestId } : {}),
          },
        };
        
        try {
          const response = await fetch(url, enhancedOptions);
          const durationMs = Date.now() - startTime;
          
          if (shouldLog) {
            console.log('═══════════════════════════════════════');
            console.log('🟢 tRPC RESPONSE');
            console.log('═══════════════════════════════════════');
            console.log('Request ID:', requestId);
            console.log('Duration:', durationMs, 'ms');
            console.log('Status:', response.status, response.statusText);
            console.log('Content-Type:', response.headers.get('content-type'));
            console.log('Content-Length:', response.headers.get('content-length'));
            
            const clonedResponse = response.clone();
            const bodyText = await clonedResponse.text();
            const truncated = bodyText.length > 2000 ? bodyText.substring(0, 2000) + '... [TRUNCATED]' : bodyText;
            console.log('Body (', bodyText.length, 'chars):', truncated);
            
            if (!response.headers.get('content-type')?.includes('application/json')) {
              console.error('⚠️ Response is NOT JSON! Content-Type:', response.headers.get('content-type'));
              console.error('Body:', truncated);
            }
            
            const urlParts = url.toString().split('/trpc/');
            if (urlParts.length > 1) {
              const procedurePath = urlParts[1];
              console.log('tRPC Procedure Path:', procedurePath);
              
              if (procedurePath.startsWith('trpc/')) {
                console.error('🚨 DOUBLE /trpc/ DETECTED! URL contains /trpc/trpc/');
                console.error('Full URL:', url);
              }
            }
          }
          
          return response;
        } catch (err: any) {
          const durationMs = Date.now() - startTime;
          
          if (shouldLog) {
            console.log('═══════════════════════════════════════');
            console.error('🔴 tRPC FETCH ERROR');
            console.log('═══════════════════════════════════════');
            console.error('Request ID:', requestId);
            console.error('Duration:', durationMs, 'ms');
            console.error('Error:', err.name, err.message);
            console.error('Stack:', err.stack);
          }
          
          throw err;
        }
      },
    }),
  ],
});
