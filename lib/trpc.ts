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

  const prefixes = ['', '/api'];

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
    `Nenhum dos prefixos testados ['', '/api'] retornou assinatura válida (id: ${EXPECTED_BACKEND_ID}). ` +
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
    console.warn('⚠️ API prefix not resolved yet, using empty prefix as fallback');
    return `${baseUrl}/trpc`;
  }
  return `${baseUrl}${cachedPrefix}/trpc`;
}

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: getTrpcUrl(),
      transformer: superjson,
      fetch(url, options) {
        console.log('🔵 tRPC Fetch:', url);
        return fetch(url, options).then(res => {
          console.log('🔵 tRPC Response:', res.status, res.statusText);
          return res;
        }).catch(err => {
          console.error('🔴 tRPC Fetch Error:', err);
          throw err;
        });
      },
    }),
  ],
});
