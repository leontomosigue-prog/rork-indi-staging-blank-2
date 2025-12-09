import { router } from 'expo-router';
import { Fingerprint, Lock, Mail } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';

export default function LoginScreen() {
  const { login, loginWithBiometric, biometricAvailable, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user) {
      console.log('🟢 login useEffect: user detected → navigate to tabs');
      console.log('🟢 login useEffect: user type:', user.type);
      console.log('🟢 login useEffect: user roles:', user.roles);
      try {
        router.replace('/(tabs)/home');
        console.log('🟢 login useEffect: replace called');
      } catch (err) {
        console.log('🟡 login useEffect: replace failed, trying push...', err);
        try {
          router.push('/(tabs)/home');
          console.log('🟢 login useEffect: push called');
        } catch (err2) {
          console.log('🟡 login useEffect: push failed, trying setTimeout...', err2);
          setTimeout(() => {
            try {
              router.replace('/(tabs)/home');
              console.log('🟢 login useEffect: setTimeout replace called');
            } catch (err3) {
              console.error('🔴 login useEffect: all navigation attempts failed', err3);
            }
          }, 0);
        }
      }
    }
  }, [user]);

  const handleLogin = async () => {
    console.log('🟢 handleLogin: Starting login process...');
    console.log('🟢 handleLogin: Email:', email);
    setErrorMessage('');
    
    if (!email.trim() || !password.trim()) {
      console.log('🟢 handleLogin: Missing credentials');
      setErrorMessage('Preencha e-mail e senha');
      return;
    }

    setIsLoading(true);
    console.log('🟢 handleLogin: Calling login function...');
    const result = await login(email, password);
    console.log('🟢 handleLogin: Login result:', result);
    setIsLoading(false);

    if (!result) {
      console.log('🔴 handleLogin: Login failed');
      setErrorMessage('E-mail ou senha incorretos');
    } else {
      console.log('🟢 handleLogin: Login successful, user will be set by AuthContext');
    }
  };

  const handleBiometricLogin = async () => {
    console.log('handleBiometricLogin: Starting biometric login...');
    setIsLoading(true);
    const result = await loginWithBiometric();
    setIsLoading(false);

    if (!result) {
      Alert.alert('Erro', 'Falha na autenticação biométrica');
    }
  };

  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <Logo size={200} noPadding />
            <Text style={styles.appName}>IndiApp</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#FFFFFF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-mail"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#FFFFFF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <Pressable onPress={() => Alert.alert('Recuperar Senha', 'Funcionalidade em desenvolvimento')}>
              <Text style={styles.forgotPassword}>Esqueceu a senha?</Text>
            </Pressable>

            <Pressable
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Entrar</Text>
              )}
            </Pressable>

            {biometricAvailable && (
              <Pressable style={styles.biometricButton} onPress={handleBiometricLogin}>
                <Fingerprint size={24} color="#FF0000" />
                <Text style={styles.biometricText}>Entrar com biometria</Text>
              </Pressable>
            )}

            <Pressable style={styles.registerLink} onPress={() => router.push('/register' as any)}>
              <Text style={styles.registerText}>
                Não tem uma conta? <Text style={styles.registerTextBold}>Cadastre-se</Text>
              </Text>
            </Pressable>

            <Pressable style={styles.debugLink} onPress={() => router.push('/debug-auth' as any)}>
              <Text style={styles.debugText}>Debug Auth</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#2B2B2B',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center' as const,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  forgotPassword: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right' as const,
    marginBottom: 24,
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#FF0000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 24,
  },
  biometricText: {
    color: '#FF0000',
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  registerLink: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  registerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  registerTextBold: {
    color: '#FF0000',
    fontWeight: '600' as const,
  },
  errorText: {
    color: '#FF0000',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  debugLink: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  debugText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    textDecorationLine: 'underline' as const,
  },
});
