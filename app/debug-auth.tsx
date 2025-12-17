import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';

export default function DebugAuthScreen() {
  const insets = useSafeAreaInsets();
  const { user, login } = useAuth();
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [isLoadingClient, setIsLoadingClient] = useState(false);
  const [lastError, setLastError] = useState('');
  const [lastResult, setLastResult] = useState('');
  const [backendStatus, setBackendStatus] = useState('Verificando...');
  const [backendUsers, setBackendUsers] = useState<any[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  
  const ensureSeedsMutation = trpc.users.ensureSeeds.useMutation();
  const loginMutation = trpc.users.login.useMutation();

  const checkBackend = useCallback(async () => {
    if (isChecking) {
      console.log('🔍 DEBUG: Already checking, skipping...');
      return;
    }
    
    setIsChecking(true);
    console.log('🔍 DEBUG: Checking backend...');
    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      console.log('🔍 DEBUG: Base URL:', baseUrl);
      
      const response = await fetch(`${baseUrl}/api/ping`);
      const data = await response.json();
      console.log('🔍 DEBUG: Backend ping response:', data);
      setBackendStatus(data.ok ? '✅ Backend Online' : '❌ Backend Error');
      
      console.log('🔍 DEBUG: Ensuring seeds...');
      const seedResult = await ensureSeedsMutation.mutateAsync();
      console.log('🔍 DEBUG: Seeds result:', seedResult);
      
      console.log('🔍 DEBUG: Fetching users from backend...');
      const usersResponse = await fetch(`${baseUrl}/backend/data/users.json`);
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        console.log('🔍 DEBUG: Users loaded:', users);
        setBackendUsers(users);
      } else {
        console.log('🔍 DEBUG: Could not load users.json');
      }
    } catch (error) {
      console.error('🔍 DEBUG: Backend check error:', error);
      setBackendStatus('❌ Backend Offline: ' + String(error));
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, ensureSeedsMutation]);

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  const handleAdminLogin = async () => {
    console.log('🟣 DEBUG: Starting admin login...');
    setLastError('');
    setLastResult('');
    setIsLoadingAdmin(true);
    
    try {
      console.log('🟣 DEBUG: Calling tRPC login mutation directly...');
      const directResult = await loginMutation.mutateAsync({
        email: 'admin@indi.com',
        password: 'admin123'
      });
      console.log('🟣 DEBUG: Direct tRPC result:', directResult);
      
      console.log('🟣 DEBUG: Calling AuthContext login...');
      const result = await login('admin@indi.com', 'admin123');
      console.log('🟣 DEBUG: Admin login result:', result);
      setLastResult(`Admin login: ${result ? 'SUCCESS' : 'FAILED'}`);
      
      if (result) {
        console.log('🟣 DEBUG: Navigating to home...');
        router.replace('/(tabs)/home' as any);
        console.log('🟣 DEBUG: Navigation called');
      }
    } catch (error: any) {
      console.error('🟣 DEBUG: Admin login error:', error);
      setLastError(error?.message || String(error));
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  const handleClientLogin = async () => {
    console.log('🟣 DEBUG: Starting client login...');
    setLastError('');
    setLastResult('');
    setIsLoadingClient(true);
    
    try {
      const result = await login('cliente@indi.com', 'cliente123');
      console.log('🟣 DEBUG: Client login result:', result);
      setLastResult(`Client login: ${result ? 'SUCCESS' : 'FAILED'}`);
      
      if (result) {
        console.log('🟣 DEBUG: Navigating to home...');
        router.replace('/(tabs)/home' as any);
        console.log('🟣 DEBUG: Navigation called');
      }
    } catch (error) {
      console.error('🟣 DEBUG: Client login error:', error);
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
        <Pressable style={styles.smallButton} onPress={checkBackend} disabled={isChecking}>
          {isChecking ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <Text style={styles.smallButtonText}>Recarregar</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Usuários no Backend</Text>
        {backendUsers.length > 0 ? (
          backendUsers.map((u, i) => (
            <Text key={i} style={styles.infoText}>
              {u.email} - {u.passwordHash}
            </Text>
          ))
        ) : (
          <Text style={styles.noUser}>Nenhum usuário encontrado</Text>
        )}
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
        <Text style={styles.sectionTitle}>Instruções</Text>
        <Text style={styles.instructionsText}>
          1. Verifique os logs no console do servidor e do app{'\n'}
          2. Pressione um dos botões acima{'\n'}
          3. Veja se navega para /(tabs)/home{'\n'}
          4. Confira o usuário atual após login{'\n'}
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
});
