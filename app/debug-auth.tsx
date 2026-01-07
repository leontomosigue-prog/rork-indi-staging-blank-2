import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { trpc, resolveApiPrefix, clearPrefixCache, getTrpcUrl } from '@/lib/trpc';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'request' | 'response';
  message: string;
  details?: any;
}

interface DetailedRequest {
  traceId: string;
  testName: string;
  timestamp: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  requestBody?: string;
  durationMs?: number;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBodyRaw?: string;
  parseResult?: string;
  trpcUrlBase?: string;
  procedure?: string;
  batch?: boolean;
  payloadShape?: string[];
}

export default function DebugAuthScreen() {
  const insets = useSafeAreaInsets();
  const { user, login } = useAuth();
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [isLoadingClient, setIsLoadingClient] = useState(false);
  const [lastError, setLastError] = useState('');
  const [lastResult, setLastResult] = useState('');
  const [backendStatus, setBackendStatus] = useState('Verificando...');
  const [detectedPrefix, setDetectedPrefix] = useState<string | null>(null);
  const [backendSignature, setBackendSignature] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [detailedRequests, setDetailedRequests] = useState<DetailedRequest[]>([]);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [traceId, setTraceId] = useState<string>('');
  const [lastRequestUrl, setLastRequestUrl] = useState<string>('');
  const [lastStatusCode, setLastStatusCode] = useState<number | null>(null);
  const [lastErrorFull, setLastErrorFull] = useState<string>('');
  const hasCheckedRef = useRef(false);
  
  const loginMutation = trpc.users.login.useMutation();

  const addLog = useCallback((type: LogEntry['type'], message: string, details?: any) => {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = { timestamp, type, message, details };
    if (process.env.SAFE_MODE_DEBUG === '1' || __DEV__) {
      console.log(`[${type.toUpperCase()}] ${message}`, details || '');
    }
    setLogs(prev => [...prev, logEntry]);
  }, []);

  const addDetailedRequest = useCallback((request: DetailedRequest) => {
    if (process.env.SAFE_MODE_DEBUG === '1' || __DEV__) {
      console.log('📋 DETAILED REQUEST:', request);
    }
    setDetailedRequests(prev => [...prev, request]);
    setLastRequestUrl(request.url);
    if (request.responseStatus) {
      setLastStatusCode(request.responseStatus);
    }
  }, []);

  const redactSensitiveData = useCallback((data: any): any => {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(redactSensitiveData(parsed));
      } catch {
        return data;
      }
    }
    if (typeof data === 'object' && data !== null) {
      const redacted = { ...data };
      if ('password' in redacted) {
        redacted.password = '***';
      }
      return redacted;
    }
    return data;
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setDetailedRequests([]);
    addLog('info', 'Logs limpos');
  }, [addLog]);

  const fetchForensics = useCallback(async (url: string, options?: RequestInit, testName?: string) => {
    const startTime = Date.now();
    const method = options?.method || 'GET';
    
    const requestHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'x-debug-trace-id': traceId,
    };
    
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        requestHeaders[key] = String(value);
      });
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: requestHeaders,
      });
      
      const durationMs = Date.now() - startTime;
      const contentType = response.headers.get('content-type') || '';
      const server = response.headers.get('server') || '';
      const xFreestyleDeploymentId = response.headers.get('x-freestyle-deployment-id') || '';
      const xIndiBackendId = response.headers.get('x-indi-backend-id') || '';
      const xIndiBuild = response.headers.get('x-indi-build') || '';
      
      const text = await response.text();
      
      let json = undefined;
      let parseResult = 'not JSON';
      
      if (contentType.includes('application/json')) {
        try {
          json = JSON.parse(text);
          parseResult = 'JSON parsed successfully';
        } catch (e: any) {
          parseResult = `JSON parse failed: ${e.message}`;
        }
      }
      
      const responseHeaders: Record<string, string> = {
        'content-type': contentType,
      };
      if (server) responseHeaders['server'] = server;
      if (xFreestyleDeploymentId) responseHeaders['x-freestyle-deployment-id'] = xFreestyleDeploymentId;
      if (xIndiBackendId) responseHeaders['x-indi-backend-id'] = xIndiBackendId;
      if (xIndiBuild) responseHeaders['x-indi-build'] = xIndiBuild;
      
      const result = {
        ok: response.ok,
        status: response.status,
        contentType,
        server,
        xFreestyleDeploymentId,
        xIndiBackendId,
        xIndiBuild,
        text,
        json,
        durationMs,
        parseResult,
        responseHeaders,
      };
      
      addLog('info', `${method} ${url}`);
      addLog('info', `Status: ${response.status} | Content-Type: ${contentType}`);
      if (xIndiBackendId) {
        addLog('info', `Backend ID: ${xIndiBackendId} | Build: ${xIndiBuild}`);
      }
      if (xFreestyleDeploymentId) {
        addLog('info', `Deployment ID: ${xFreestyleDeploymentId}`);
      }
      
      if (!contentType.includes('application/json')) {
        const truncated = text.length > 1000 ? text.substring(0, 1000) + '... [TRUNCATED]' : text;
        addLog('error', '⚠️ Response is NOT JSON!', {
          contentType,
          body: truncated,
        });
      }
      
      if (response.status >= 400) {
        const truncated = text.length > 1000 ? text.substring(0, 1000) + '... [TRUNCATED]' : text;
        addLog('error', `❌ ${method} ${url} -> ${response.status}`, {
          contentType,
          body: truncated,
        });
      }
      
      if (testName && (process.env.SAFE_MODE_DEBUG === '1' || __DEV__)) {
        addDetailedRequest({
          traceId,
          testName,
          timestamp: new Date().toISOString(),
          method,
          url,
          headers: requestHeaders,
          requestBody: options?.body ? String(options.body) : undefined,
          durationMs,
          responseStatus: response.status,
          responseHeaders,
          responseBodyRaw: text,
          parseResult,
        });
      }
      
      return result;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      addLog('error', `❌ Network error: ${method} ${url}`, {
        error: error.message,
      });
      
      return {
        ok: false,
        status: 0,
        contentType: '',
        server: '',
        xFreestyleDeploymentId: '',
        xIndiBackendId: '',
        xIndiBuild: '',
        text: `Network error: ${error.message}`,
        json: undefined,
        durationMs,
        parseResult: 'network error',
        responseHeaders: {},
      };
    }
  }, [addLog, addDetailedRequest, traceId]);

  const copyLogs = useCallback(async () => {
    try {
      let logText = '═══════════════════════════════════════════════════════\n';
      logText += '     LOGS FORENSES - FRONTEND ↔ BACKEND\n';
      logText += '═══════════════════════════════════════════════════════\n\n';
      
      logText += '🧷 RESUMO\n';
      logText += '─'.repeat(50) + '\n';
      logText += `Trace ID: ${traceId}\n`;
      logText += `Platform: ${Platform.OS}\n`;
      logText += `Base URL: ${process.env.EXPO_PUBLIC_RORK_API_BASE_URL}\n`;
      logText += `Prefixo Detectado: "${detectedPrefix || 'não resolvido'}"\n`;
      logText += `tRPC URL Final: ${getTrpcUrl()}\n`;
      logText += `Última URL Chamada: ${lastRequestUrl || 'nenhuma'}\n`;
      logText += `Último Status Code: ${lastStatusCode !== null ? lastStatusCode : 'N/A'}\n`;
      logText += `Último Erro: ${lastErrorFull || 'nenhum'}\n`;
      logText += `Ambiente: ${process.env.NODE_ENV || 'development'}\n`;
      logText += `Timestamp Geração: ${new Date().toISOString()}\n`;
      logText += '\n' + '═'.repeat(50) + '\n\n';
      
      logText += '📋 REQUESTS DETALHADOS\n';
      logText += '─'.repeat(50) + '\n\n';
      
      detailedRequests.forEach((req, index) => {
        logText += `[REQUEST #${index + 1}]\n`;
        logText += `├─ Trace ID: ${req.traceId}\n`;
        logText += `├─ Test Name: ${req.testName}\n`;
        logText += `├─ Timestamp: ${req.timestamp}\n`;
        logText += `├─ Method: ${req.method}\n`;
        logText += `├─ URL: ${req.url}\n`;
        
        if (req.headers) {
          logText += `├─ Request Headers:\n`;
          Object.entries(req.headers).forEach(([k, v]) => {
            logText += `│  • ${k}: ${k.toLowerCase().includes('authorization') ? '[REDACTED]' : v}\n`;
          });
        }
        
        if (req.requestBody) {
          const truncated = req.requestBody.length > 2000 ? req.requestBody.substring(0, 2000) + '... [TRUNCATED]' : req.requestBody;
          logText += `├─ Request Body (${req.requestBody.length} chars):\n${truncated}\n`;
        }
        
        if (req.trpcUrlBase) {
          logText += `├─ tRPC Base URL: ${req.trpcUrlBase}\n`;
        }
        if (req.procedure) {
          logText += `├─ Procedure: ${req.procedure}\n`;
        }
        if (req.batch !== undefined) {
          logText += `├─ Batch: ${req.batch}\n`;
        }
        if (req.payloadShape) {
          logText += `├─ Payload Shape: [${req.payloadShape.join(', ')}]\n`;
        }
        
        if (req.durationMs !== undefined) {
          logText += `├─ Duration: ${req.durationMs}ms\n`;
        }
        
        if (req.responseStatus !== undefined) {
          logText += `├─ Response Status: ${req.responseStatus}\n`;
        }
        
        if (req.responseHeaders) {
          logText += `├─ Response Headers:\n`;
          Object.entries(req.responseHeaders).forEach(([k, v]) => {
            logText += `│  • ${k}: ${v}\n`;
          });
        }
        
        if (req.responseBodyRaw) {
          const truncated = req.responseBodyRaw.length > 2000 ? req.responseBodyRaw.substring(0, 2000) + '... [TRUNCATED]' : req.responseBodyRaw;
          logText += `├─ Response Body (${req.responseBodyRaw.length} chars):\n${truncated}\n`;
        }
        
        if (req.parseResult) {
          logText += `└─ Parse Result: ${req.parseResult}\n`;
        }
        
        logText += '\n' + '─'.repeat(50) + '\n\n';
      });
      
      logText += '\n📝 LOGS SIMPLES\n';
      logText += '─'.repeat(50) + '\n\n';
      
      logs.forEach((log, index) => {
        logText += `[${index + 1}] [${log.type.toUpperCase()}] ${log.timestamp}\n`;
        logText += `${log.message}\n`;
        if (log.details) {
          logText += `Details: ${typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}\n`;
        }
        logText += '\n';
      });
      
      await Clipboard.setStringAsync(logText);
      setCopyFeedback('✅ Copiado!');
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch {
      setCopyFeedback('❌ Erro ao copiar');
      setTimeout(() => setCopyFeedback(''), 2000);
    }
  }, [logs, detailedRequests, traceId, detectedPrefix, lastRequestUrl, lastStatusCode, lastErrorFull]);

  const checkBackend = useCallback(async (force = false) => {
    if (!force && hasCheckedRef.current) {
      addLog('info', 'Verificação já realizada, pulando...');
      return;
    }
    
    hasCheckedRef.current = true;
    const newTraceId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setTraceId(newTraceId);
    (globalThis as any).__DEBUG_TRACE_ID = newTraceId;
    setBackendStatus('🔄 Verificando...');
    setLastError('');
    setLastResult('');
    setLastErrorFull('');
    setLastRequestUrl('');
    setLastStatusCode(null);
    setDetectedPrefix(null);
    setBackendSignature(null);
    
    if (force) {
      clearPrefixCache();
    }
    
    addLog('info', '═══════════════════════════════════════');
    addLog('info', 'INICIANDO VERIFICAÇÃO COMPLETA DO BACKEND');
    addLog('info', '═══════════════════════════════════════');
    
    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      addLog('info', `Platform: ${Platform.OS}`);
      addLog('info', `Base URL configurada: ${baseUrl || 'NÃO CONFIGURADO'}`);
      addLog('info', `Ambiente: ${process.env.NODE_ENV || 'development'}`);
      
      if (!baseUrl) {
        throw new Error('EXPO_PUBLIC_RORK_API_BASE_URL não está configurado');
      }

      addLog('info', '\n--- TESTE 1: DETECÇÃO AUTOMÁTICA DE PREFIXO ---');
      addLog('info', 'Testando prefixo: ["/api"] (backend publicado SOMENTE em /api)');
      
      let prefix: string;
      try {
        prefix = await resolveApiPrefix(baseUrl);
        setDetectedPrefix(prefix);
        addLog('success', `✅ PREFIXO ESCOLHIDO: "${prefix}"`);
      } catch (err: any) {
        addLog('error', `❌ Falha ao detectar prefixo: ${err.message}`);
        setBackendStatus('❌ Backend inválido ou URL errada');
        setLastError(err.message);
        return;
      }

      addLog('info', '\n--- TESTE 2: VALIDAÇÃO DE ASSINATURA ---');
      const whoamiUrl = `${baseUrl}${prefix}/__whoami`;
      addLog('request', `GET ${whoamiUrl}`);
      
      const whoamiResult = await fetchForensics(whoamiUrl, { method: 'GET' }, 'Validação de Assinatura');
      
      if (!whoamiResult.ok || !whoamiResult.json) {
        throw new Error(`Falha na validação: ${whoamiResult.status} - ${whoamiResult.text}`);
      }
      
      const whoamiData = whoamiResult.json;
      setBackendSignature(whoamiData);
      
      addLog('response', `Status: ${whoamiResult.status}`, {
        contentType: whoamiResult.contentType,
      });
      
      addLog('success', `✅ ASSINATURA DO BACKEND:`);
      addLog('info', `   ID: ${whoamiData.id}`);
      addLog('info', `   Version: ${whoamiData.version}`);
      addLog('info', `   Build Timestamp: ${whoamiData.buildTimestamp}`);
      addLog('info', `   Server Time: ${whoamiData.at}`);

      addLog('info', '\n--- TESTE 3: POSTCHECK (Testar POST fora do tRPC) ---');
      const postcheckUrl = `${baseUrl}${prefix}/postcheck`;
      addLog('request', `POST ${postcheckUrl}`);
      
      const postcheckResult = await fetchForensics(postcheckUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      }, 'POSTCHECK');
      
      if (!postcheckResult.ok || !postcheckResult.json) {
        addLog('error', `❌ POSTCHECK falhou: ${postcheckResult.status} - ${postcheckResult.text}`);
      } else {
        addLog('success', `✅ POSTCHECK OK: ${JSON.stringify(postcheckResult.json)}`);
      }

      addLog('info', '\n--- TESTE 4: PING ENDPOINT ---');
      const pingUrl = `${baseUrl}${prefix}/ping`;
      addLog('request', `GET ${pingUrl}`);
      
      const pingResult = await fetchForensics(pingUrl, { method: 'GET' }, 'Ping Endpoint');
      
      if (!pingResult.ok || !pingResult.json) {
        throw new Error(`Ping falhou: ${pingResult.status} - ${pingResult.text}`);
      }
      
      addLog('success', `✅ Ping OK: ${JSON.stringify(pingResult.json)}`);

      addLog('info', '\n--- TESTE 5: HEALTH ENDPOINT ---');
      const healthUrl = `${baseUrl}${prefix}/health`;
      addLog('request', `GET ${healthUrl}`);
      
      const healthResult = await fetchForensics(healthUrl, { method: 'GET' }, 'Health Endpoint');
      
      if (!healthResult.ok || !healthResult.json) {
        throw new Error(`Health falhou: ${healthResult.status} - ${healthResult.text}`);
      }
      
      addLog('success', `✅ Health OK: ${JSON.stringify(healthResult.json)}`);

      addLog('info', '\n--- TESTE 6: PROBE DO TRPC ---');
      const trpcProbeUrl = `${baseUrl}${prefix}/trpc/__probe`;
      addLog('request', `GET ${trpcProbeUrl}`);
      
      const probeResult = await fetchForensics(trpcProbeUrl, { method: 'GET' }, 'Probe do tRPC');
      
      if (probeResult.status === 404) {
        addLog('error', '❌ /trpc/__probe não existe (backend não foi atualizado)');
        addLog('error', `URL tentada: ${trpcProbeUrl}`);
        addLog('error', `Status: ${probeResult.status}`);
        addLog('error', `Content-Type: ${probeResult.contentType}`);
        addLog('error', `Body: ${probeResult.text}`);
      } else if (!probeResult.ok || !probeResult.json) {
        addLog('error', `❌ Falha no probe: ${probeResult.status} - ${probeResult.text}`);
      } else {
        const probeData = probeResult.json;
        addLog('success', `✅ Probe OK: ${JSON.stringify(probeData)}`);
      }

      addLog('info', '\n--- TESTE 7: DEBUG ROUTES (Verificar Procedures) ---');
      const trpcRoutesUrl = `${baseUrl}${prefix}/__trpc_routes`;
      addLog('request', `GET ${trpcRoutesUrl}`);
      
      const routesResult = await fetchForensics(trpcRoutesUrl, { method: 'GET' }, 'Debug Routes');
      
      if (routesResult.status === 404) {
        addLog('error', '❌ __trpc_routes não existe (backend não foi atualizado)');
        addLog('error', `URL tentada: ${trpcRoutesUrl}`);
        addLog('error', `Status: ${routesResult.status}`);
        addLog('error', `Body: ${routesResult.text}`);
      } else if (!routesResult.ok || !routesResult.json) {
        addLog('error', `❌ Falha ao buscar routes: ${routesResult.status} - ${routesResult.text}`);
      } else {
        const routesData = routesResult.json;
        addLog('success', `✅ __trpc_routes OK: ${routesData.count} procedures encontradas`);
        
        const hasEnsureSeeds = routesData.procedures?.includes('users.ensureSeeds');
        const hasLogin = routesData.procedures?.includes('users.login');
        
        if (hasEnsureSeeds && hasLogin) {
          addLog('success', '✅ Procedures users.ensureSeeds e users.login ENCONTRADAS');
        } else {
          addLog('error', `❌ Procedures faltando: ${!hasEnsureSeeds ? 'users.ensureSeeds ' : ''}${!hasLogin ? 'users.login' : ''}`);
        }
        
        addLog('info', `Todas procedures: ${JSON.stringify(routesData.procedures, null, 2)}`);
      }

      addLog('info', '\n--- TESTE 8: tRPC CONFIGURATION ---');
      const finalTrpcUrl = getTrpcUrl();
      addLog('info', `URL FINAL DO tRPC: ${finalTrpcUrl}`);
      addLog('info', `Montagem: \${baseUrl}\${prefix}/trpc`);
      addLog('info', `Resultado: ${finalTrpcUrl}`);
      
      addLog('info', '\n--- TESTE 9: tRPC ensureSeeds (FETCH RAW) ---');
      const ensureSeedsUrl = `${finalTrpcUrl}/users.ensureSeeds`;
      addLog('request', `POST ${ensureSeedsUrl}`);
      
      const ensureSeedsResult = await fetchForensics(ensureSeedsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }, 'tRPC ensureSeeds');
      
      if (!ensureSeedsResult.ok || !ensureSeedsResult.json) {
        addLog('error', `❌ ensureSeeds falhou: ${ensureSeedsResult.status}`);
        addLog('error', `Content-Type: ${ensureSeedsResult.contentType}`);
        addLog('error', `Body: ${ensureSeedsResult.text}`);
      } else {
        const seedResult = ensureSeedsResult.json;
        addLog('response', 'Seeds result recebido', seedResult);
        addLog('success', '✅ tRPC ensureSeeds OK');
        setLastResult(`Seeds: ${JSON.stringify(seedResult)}`);
        setBackendStatus('✅ Backend Online & tRPC OK');
      }
      
      addLog('success', '\n✅ TODAS AS VERIFICAÇÕES CONCLUÍDAS COM SUCESSO');
    } catch (error: any) {
      addLog('error', '\n❌❌❌ ERRO COMPLETO DO BACKEND ❌❌❌');
      addLog('error', `Tipo: ${error?.constructor?.name || error?.name || 'Unknown'}`);
      addLog('error', `Mensagem: ${error?.message || String(error)}`);
      
      if (error?.data) {
        addLog('error', 'Data do tRPC:', error.data);
      }
      
      if (error?.shape) {
        addLog('error', 'Shape do erro tRPC:', error.shape);
      }
      
      if (error?.cause) {
        addLog('error', 'Causa:', error.cause);
      }
      
      if (error?.stack) {
        addLog('error', `Stack Trace:\n${error.stack}`);
      }
      
      addLog('error', 'Erro completo (JSON):', JSON.stringify(error, null, 2));
      
      const fullError = `ERRO DO BACKEND:\n\nTipo: ${error?.constructor?.name || error?.name || 'Unknown'}\nMensagem: ${error?.message || String(error)}\n\nData: ${error?.data ? JSON.stringify(error.data, null, 2) : 'N/A'}\n\nShape: ${error?.shape ? JSON.stringify(error.shape, null, 2) : 'N/A'}\n\nCause: ${error?.cause ? JSON.stringify(error.cause, null, 2) : 'N/A'}\n\nStack: ${error?.stack || 'N/A'}\n\nObjeto completo:\n${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      setLastErrorFull(fullError);
      
      setBackendStatus('❌ Backend Error');
      setLastError(`${error?.name || 'Error'}: ${error?.message || String(error)}`);
    }
  }, [addLog, fetchForensics]);

  useEffect(() => {
    checkBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdminLogin = async () => {
    addLog('info', '\n--- TESTE DE LOGIN ADMIN ---');
    setLastError('');
    setLastResult('');
    setLastErrorFull('');
    setIsLoadingAdmin(true);
    
    try {
      const credentials = { email: 'admin@indi.com', password: 'admin123' };
      const redactedCreds = redactSensitiveData(credentials);
      addLog('request', 'Chamando tRPC login mutation', redactedCreds);
      
      if (process.env.SAFE_MODE_DEBUG === '1' || __DEV__) {
        addDetailedRequest({
          traceId,
          testName: 'Login Admin',
          timestamp: new Date().toISOString(),
          method: 'POST',
          url: `${getTrpcUrl()}/users.login`,
          trpcUrlBase: getTrpcUrl(),
          procedure: 'users.login',
          batch: false,
          payloadShape: Object.keys(credentials),
          requestBody: JSON.stringify(redactedCreds),
        });
      }
      
      const directResult = await loginMutation.mutateAsync(credentials);
      addLog('response', 'Resultado tRPC direto', directResult);
      
      addLog('info', 'Chamando AuthContext login...');
      const result = await login('admin@indi.com', 'admin123');
      addLog(result ? 'success' : 'error', `Login result: ${result ? 'SUCCESS' : 'FAILED'}`);
      setLastResult(`Admin login: ${result ? 'SUCCESS' : 'FAILED'}`);
      
      if (result) {
        addLog('info', 'Navegando para /(tabs)/home...');
        router.replace('/(tabs)/home' as any);
        addLog('success', 'Navegação executada');
      }
    } catch (error: any) {
      addLog('error', '\n❌❌❌ ERRO COMPLETO DO LOGIN ADMIN ❌❌❌');
      addLog('error', `Tipo: ${error?.constructor?.name || error?.name || 'Unknown'}`);
      addLog('error', `Mensagem: ${error?.message || String(error)}`);
      
      if (error?.data) {
        addLog('error', 'Data do tRPC:', error.data);
      }
      
      if (error?.shape) {
        addLog('error', 'Shape do erro tRPC:', error.shape);
      }
      
      if (error?.cause) {
        addLog('error', 'Causa:', error.cause);
      }
      
      if (error?.stack) {
        addLog('error', `Stack Trace:\n${error.stack}`);
      }
      
      addLog('error', 'Erro completo (JSON):', JSON.stringify(error, null, 2));
      
      const fullError = `ERRO DO LOGIN ADMIN:\n\nTipo: ${error?.constructor?.name || error?.name || 'Unknown'}\nMensagem: ${error?.message || String(error)}\n\nData: ${error?.data ? JSON.stringify(error.data, null, 2) : 'N/A'}\n\nShape: ${error?.shape ? JSON.stringify(error.shape, null, 2) : 'N/A'}\n\nCause: ${error?.cause ? JSON.stringify(error.cause, null, 2) : 'N/A'}\n\nStack: ${error?.stack || 'N/A'}\n\nObjeto completo:\n${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      setLastErrorFull(fullError);
      
      setLastError(error?.message || String(error));
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  const handleClientLogin = async () => {
    addLog('info', '\n--- TESTE DE LOGIN CLIENTE ---');
    setLastError('');
    setLastResult('');
    setLastErrorFull('');
    setIsLoadingClient(true);
    
    try {
      addLog('request', 'Chamando AuthContext login', {
        email: 'cliente@indi.com',
        password: '***'
      });
      
      const result = await login('cliente@indi.com', 'cliente123');
      addLog(result ? 'success' : 'error', `Login result: ${result ? 'SUCCESS' : 'FAILED'}`);
      setLastResult(`Client login: ${result ? 'SUCCESS' : 'FAILED'}`);
      
      if (result) {
        addLog('info', 'Navegando para /(tabs)/home...');
        router.replace('/(tabs)/home' as any);
        addLog('success', 'Navegação executada');
      }
    } catch (error: any) {
      addLog('error', '\n❌❌❌ ERRO COMPLETO DO LOGIN CLIENTE ❌❌❌');
      addLog('error', `Tipo: ${error?.constructor?.name || error?.name || 'Unknown'}`);
      addLog('error', `Mensagem: ${error?.message || String(error)}`);
      
      if (error?.data) {
        addLog('error', 'Data do tRPC:', error.data);
      }
      
      if (error?.shape) {
        addLog('error', 'Shape do erro tRPC:', error.shape);
      }
      
      if (error?.cause) {
        addLog('error', 'Causa:', error.cause);
      }
      
      if (error?.stack) {
        addLog('error', `Stack Trace:\n${error.stack}`);
      }
      
      addLog('error', 'Erro completo (JSON):', JSON.stringify(error, null, 2));
      
      const fullError = `ERRO DO LOGIN CLIENTE:\n\nTipo: ${error?.constructor?.name || error?.name || 'Unknown'}\nMensagem: ${error?.message || String(error)}\n\nData: ${error?.data ? JSON.stringify(error.data, null, 2) : 'N/A'}\n\nShape: ${error?.shape ? JSON.stringify(error.shape, null, 2) : 'N/A'}\n\nCause: ${error?.cause ? JSON.stringify(error.cause, null, 2) : 'N/A'}\n\nStack: ${error?.stack || 'N/A'}\n\nObjeto completo:\n${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      setLastErrorFull(fullError);
      
      setLastError(String(error));
    } finally {
      setIsLoadingClient(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
    >
      <Text style={styles.title}>Debug de Autenticação</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧷 RESUMO</Text>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>Status:</Text>
          <Text style={styles.infoText}>{backendStatus}</Text>
        </View>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>Trace ID:</Text>
          <Text style={styles.highlightValue}>{traceId || 'Aguardando verificação...'}</Text>
        </View>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>Base URL:</Text>
          <Text style={styles.infoText}>{process.env.EXPO_PUBLIC_RORK_API_BASE_URL}</Text>
        </View>
        {detectedPrefix !== null && (
          <View style={styles.highlightBox}>
            <Text style={styles.highlightTitle}>🎯 PREFIXO DETECTADO:</Text>
            <Text style={styles.highlightValue}>{`"${detectedPrefix}"`}</Text>
          </View>
        )}
        {backendSignature && (
          <View style={styles.highlightBox}>
            <Text style={styles.highlightTitle}>🔐 ASSINATURA DO BACKEND:</Text>
            <Text style={styles.highlightDetail}>ID: {backendSignature.id}</Text>
            <Text style={styles.highlightDetail}>Version: {backendSignature.version}</Text>
            <Text style={styles.highlightDetail}>Build: {backendSignature.buildTimestamp}</Text>
          </View>
        )}
        {detectedPrefix !== null && (
          <View style={styles.highlightBox}>
            <Text style={styles.highlightTitle}>🔗 URL FINAL DO tRPC:</Text>
            <Text style={styles.highlightValue}>{getTrpcUrl()}</Text>
          </View>
        )}
        {lastRequestUrl && (
          <View style={styles.highlightBox}>
            <Text style={styles.highlightTitle}>Última URL Chamada:</Text>
            <Text style={styles.infoText}>{lastRequestUrl}</Text>
          </View>
        )}
        {lastStatusCode !== null && (
          <View style={styles.highlightBox}>
            <Text style={styles.highlightTitle}>Último Status Code:</Text>
            <Text style={styles.infoText}>{lastStatusCode}</Text>
          </View>
        )}
        {lastErrorFull && (
          <View style={[styles.highlightBox, { borderLeftColor: '#ef4444' }]}>
            <Text style={[styles.highlightTitle, { color: '#ef4444' }]}>❌ ERRO COMPLETO DO BACKEND:</Text>
            <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
              <Text style={[styles.infoText, { fontSize: 10, color: '#fca5a5' }]}>{lastErrorFull}</Text>
            </ScrollView>
          </View>
        )}
        <Pressable style={styles.smallButton} onPress={() => {
          hasCheckedRef.current = false;
          checkBackend(true);
        }}>
          <Text style={styles.smallButtonText}>Recarregar</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Info do Backend</Text>
        <Text style={styles.infoText}>Ambiente: {process.env.NODE_ENV || 'development'}</Text>
        <Text style={styles.infoText}>SurrealDB: {process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT ? 'Configurado' : 'Memory Store'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Usuário Atual</Text>
        {user ? (
          <View style={styles.userInfo}>
            <Text style={styles.infoText}>ID: {user.id}</Text>
            <Text style={styles.infoText}>Email: {user.email}</Text>
            <Text style={styles.infoText}>Nome: {user.fullName}</Text>
            <Text style={styles.infoText}>Tipo: {user.type}</Text>
            <Text style={styles.infoText}>
              Roles: {user.roles ? JSON.stringify(user.roles) : 'N/A'}
            </Text>
          </View>
        ) : (
          <Text style={styles.noUser}>Nenhum usuário logado</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Testes de Login</Text>
        
        <Pressable
          style={[styles.button, isLoadingAdmin && styles.buttonDisabled]}
          onPress={handleAdminLogin}
          disabled={isLoadingAdmin}
        >
          {isLoadingAdmin ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Login Admin Seed</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.button, isLoadingClient && styles.buttonDisabled]}
          onPress={handleClientLogin}
          disabled={isLoadingClient}
        >
          {isLoadingClient ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Login Cliente Seed</Text>
          )}
        </Pressable>
      </View>

      {lastResult ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Último Resultado</Text>
          <Text style={styles.resultText}>{lastResult}</Text>
        </View>
      ) : null}

      {lastError ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Último Erro</Text>
          <Text style={styles.errorText}>{lastError}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.logHeader}>
          <Text style={styles.sectionTitle}>Logs de Comunicação Frontend-Backend</Text>
          <View style={styles.logActions}>
            {copyFeedback ? (
              <Text style={styles.copyFeedback}>{copyFeedback}</Text>
            ) : null}
            <Pressable style={styles.copyButton} onPress={copyLogs}>
              <Text style={styles.copyButtonText}>📋 COPIAR LOG COMPLETO</Text>
            </Pressable>
            <Pressable style={styles.clearButton} onPress={clearLogs}>
              <Text style={styles.clearButtonText}>Limpar</Text>
            </Pressable>
          </View>
        </View>
        <ScrollView style={styles.logContainer} nestedScrollEnabled>
          {logs.map((log, index) => (
            <View key={index} style={styles.logEntry}>
              <Text style={[
                styles.logText,
                log.type === 'success' && styles.logSuccess,
                log.type === 'error' && styles.logError,
                log.type === 'request' && styles.logRequest,
                log.type === 'response' && styles.logResponse,
              ]}>
                [{log.timestamp.split('T')[1].split('.')[0]}] {log.message}
              </Text>
              {log.details && (
                <Text style={styles.logDetails}>
                  {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                </Text>
              )}
            </View>
          ))}
          {logs.length === 0 && (
            <Text style={styles.noLogs}>Nenhum log ainda. Execute uma verificação ou login.</Text>
          )}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instruções</Text>
        <Text style={styles.instructionsText}>
          1. Verifique os logs acima para ver todas as comunicações{'\n'}
          2. Pressione {`"Recarregar"`} para testar novamente{'\n'}
          3. Use os botões de login para testar autenticação{'\n'}
          4. Todos os requests e responses estão nos logs{'\n'}
          {'\n'}
          Credenciais dos seeds:{'\n'}
          • admin@indi.com / admin123{'\n'}
          • cliente@indi.com / cliente123
        </Text>
      </View>

      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Voltar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  userInfo: {
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: 'monospace' as const,
  },
  noUser: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: 'italic' as const,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  resultText: {
    fontSize: 14,
    color: '#10b981',
    fontFamily: 'monospace' as const,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    fontFamily: 'monospace' as const,
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  smallButton: {
    backgroundColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  smallButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  logContainer: {
    maxHeight: 400,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
  },
  logEntry: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  logText: {
    fontSize: 12,
    color: '#ddd',
    fontFamily: 'monospace' as const,
  },
  logSuccess: {
    color: '#10b981',
  },
  logError: {
    color: '#ef4444',
  },
  logRequest: {
    color: '#3b82f6',
  },
  logResponse: {
    color: '#8b5cf6',
  },
  logDetails: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace' as const,
    marginTop: 4,
    marginLeft: 8,
  },
  noLogs: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic' as const,
    textAlign: 'center',
    padding: 20,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyButtonText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  clearButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#ddd',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  copyFeedback: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600' as const,
  },
  highlightBox: {
    backgroundColor: '#2a2a2a',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    padding: 12,
    marginTop: 12,
    borderRadius: 8,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 6,
  },
  highlightValue: {
    fontSize: 14,
    fontFamily: 'monospace' as const,
    color: '#10b981',
    fontWeight: '600' as const,
  },
  highlightDetail: {
    fontSize: 12,
    fontFamily: 'monospace' as const,
    color: '#ddd',
    marginTop: 2,
  },
});
