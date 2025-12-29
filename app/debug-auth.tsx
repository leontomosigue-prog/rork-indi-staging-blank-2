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
  const [copyFeedback, setCopyFeedback] = useState('');
  const hasCheckedRef = useRef(false);
  
  const ensureSeedsMutation = trpc.users.ensureSeeds.useMutation();
  const loginMutation = trpc.users.login.useMutation();

  const addLog = useCallback((type: LogEntry['type'], message: string, details?: any) => {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = { timestamp, type, message, details };
    console.log(`[${type.toUpperCase()}] ${message}`, details || '');
    setLogs(prev => [...prev, logEntry]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog('info', 'Logs limpos');
  }, [addLog]);

  const copyLogs = useCallback(async () => {
    try {
      let logText = '=== LOGS DE DEBUG - FRONTEND/BACKEND ===\n\n';
      logText += `Platform: ${Platform.OS}\n`;
      logText += `Base URL: ${process.env.EXPO_PUBLIC_RORK_API_BASE_URL}\n`;
      logText += `Ambiente: ${process.env.NODE_ENV || 'development'}\n`;
      logText += `Timestamp: ${new Date().toISOString()}\n`;
      logText += '\n' + '='.repeat(50) + '\n\n';
      
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
  }, [logs]);

  const checkBackend = useCallback(async (force = false) => {
    if (!force && hasCheckedRef.current) {
      addLog('info', 'Verificação já realizada, pulando...');
      return;
    }
    
    hasCheckedRef.current = true;
    setBackendStatus('🔄 Verificando...');
    setLastError('');
    setLastResult('');
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

      // Teste 1: Detecção automática de prefixo
      addLog('info', '\n--- TESTE 1: DETECÇÃO AUTOMÁTICA DE PREFIXO ---');
      addLog('info', 'Testando prefixos: ["", "/api"]');
      
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

      // Teste 2: Validar assinatura do backend
      addLog('info', '\n--- TESTE 2: VALIDAÇÃO DE ASSINATURA ---');
      const whoamiUrl = `${baseUrl}${prefix}/__whoami`;
      addLog('request', `GET ${whoamiUrl}`);
      
      const whoamiResponse = await fetch(whoamiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      addLog('response', `Status: ${whoamiResponse.status}`, {
        headers: Object.fromEntries(whoamiResponse.headers.entries()),
      });
      
      const whoamiData = await whoamiResponse.json();
      setBackendSignature(whoamiData);
      
      addLog('success', `✅ ASSINATURA DO BACKEND:`);
      addLog('info', `   ID: ${whoamiData.id}`);
      addLog('info', `   Version: ${whoamiData.version}`);
      addLog('info', `   Build Timestamp: ${whoamiData.buildTimestamp}`);
      addLog('info', `   Server Time: ${whoamiData.at}`);

      // Teste 3: Ping com assinatura
      addLog('info', '\n--- TESTE 3: PING ENDPOINT ---');
      const pingUrl = `${baseUrl}${prefix}/ping`;
      addLog('request', `GET ${pingUrl}`);
      
      const pingResponse = await fetch(pingUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      addLog('response', `Status: ${pingResponse.status}`, {
        headers: Object.fromEntries(pingResponse.headers.entries()),
      });
      
      const pingData = await pingResponse.json();
      addLog('success', `✅ Ping OK: ${JSON.stringify(pingData)}`);

      // Teste 4: Health endpoint
      addLog('info', '\n--- TESTE 4: HEALTH ENDPOINT ---');
      const healthUrl = `${baseUrl}${prefix}/health`;
      addLog('request', `GET ${healthUrl}`);
      
      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      addLog('response', `Status: ${healthResponse.status}`, {
        headers: Object.fromEntries(healthResponse.headers.entries()),
      });
      
      const healthData = await healthResponse.json();
      addLog('success', `✅ Health OK: ${JSON.stringify(healthData)}`);

      // Teste 5: tRPC URL final
      addLog('info', '\n--- TESTE 5: tRPC CONFIGURATION ---');
      const finalTrpcUrl = getTrpcUrl();
      addLog('info', `URL FINAL DO tRPC: ${finalTrpcUrl}`);
      addLog('info', `Montagem: \${baseUrl}\${prefix}/trpc`);
      addLog('info', `Resultado: ${finalTrpcUrl}`);
      
      // Teste 6: tRPC ensureSeeds
      addLog('info', '\n--- TESTE 6: tRPC ensureSeeds ---');
      addLog('request', `POST ${finalTrpcUrl}/users.ensureSeeds`);
      
      const seedResult = await ensureSeedsMutation.mutateAsync();
      addLog('response', 'Seeds result recebido', seedResult);
      addLog('success', '✅ tRPC ensureSeeds OK');
      
      setBackendStatus('✅ Backend Online & tRPC OK');
      setLastResult(`Seeds: ${JSON.stringify(seedResult)}`);
      addLog('success', '\n✅ TODAS AS VERIFICAÇÕES CONCLUÍDAS COM SUCESSO');
    } catch (error: any) {
      addLog('error', `Erro fatal: ${error?.name || 'Error'}: ${error?.message || String(error)}`, {
        stack: error?.stack,
        cause: error?.cause,
      });
      
      setBackendStatus('❌ Backend Error');
      setLastError(`${error?.name || 'Error'}: ${error?.message || String(error)}`);
    }
  }, [ensureSeedsMutation, addLog]);

  useEffect(() => {
    checkBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdminLogin = async () => {
    addLog('info', '\n--- TESTE DE LOGIN ADMIN ---');
    setLastError('');
    setLastResult('');
    setIsLoadingAdmin(true);
    
    try {
      const credentials = { email: 'admin@indi.com', password: 'admin123' };
      addLog('request', 'Chamando tRPC login mutation', credentials);
      
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
      addLog('error', `Erro no login admin: ${error?.message || String(error)}`, {
        name: error?.name,
        stack: error?.stack,
        cause: error?.cause,
      });
      setLastError(error?.message || String(error));
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  const handleClientLogin = async () => {
    addLog('info', '\n--- TESTE DE LOGIN CLIENTE ---');
    setLastError('');
    setLastResult('');
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
      addLog('error', `Erro no login cliente: ${String(error)}`, error);
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
        <Text style={styles.sectionTitle}>Status do Backend</Text>
        <Text style={styles.infoText}>{backendStatus}</Text>
        <Text style={styles.infoText}>Base URL: {process.env.EXPO_PUBLIC_RORK_API_BASE_URL}</Text>
        {detectedPrefix !== null && (
          <View style={styles.highlightBox}>
            <Text style={styles.highlightTitle}>🎯 PREFIXO DETECTADO:</Text>
            <Text style={styles.highlightValue}>&quot;{detectedPrefix}&quot;</Text>
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
              <Text style={styles.copyButtonText}>Copiar Logs</Text>
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
          2. Pressione &quot;Recarregar&quot; para testar novamente{'\n'}
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
