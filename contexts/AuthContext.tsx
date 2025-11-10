import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@/types';
import { trpcClient } from '@/lib/trpc';
import type { User as BackendUser } from '@/backend/data/schemas';

const STORAGE_KEYS = {
  CURRENT_USER: '@indi:user',
  USERS_DB: '@indi:usersDb',
  BIOMETRIC_ENABLED: '@indi:biometricEnabled',
};

const MOCK_USERS: User[] = [
  {
    id: '1',
    type: 'employee',
    email: 'admin@indi.test',
    fullName: 'Admin Teste',
    roles: ['Admin', 'Vendas', 'Locação', 'Assistência Técnica', 'Peças'],
    lgpdConsent: true,
    lgpdConsentDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'employee',
    email: 'vendas@indi.test',
    fullName: 'Vendas Teste',
    roles: ['Vendas'],
    lgpdConsent: true,
    lgpdConsentDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    type: 'employee',
    email: 'locacao@indi.test',
    fullName: 'Locação Teste',
    roles: ['Locação'],
    lgpdConsent: true,
    lgpdConsentDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    type: 'employee',
    email: 'assistencia@indi.test',
    fullName: 'Assistência Teste',
    roles: ['Assistência Técnica'],
    lgpdConsent: true,
    lgpdConsentDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    type: 'employee',
    email: 'pecas@indi.test',
    fullName: 'Peças Teste',
    roles: ['Peças'],
    lgpdConsent: true,
    lgpdConsentDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '6',
    type: 'client',
    email: 'cliente@indi.test',
    fullName: 'Cliente Teste',
    phone: '11999999999',
    birthDate: '1990-01-01',
    cpf: '12345678900',
    companyName: 'Empresa Teste Ltda',
    cnpj: '12345678000190',
    lgpdConsent: true,
    lgpdConsentDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    console.log('AuthContext: Initializing authentication...');
    try {
      const storedUser = await AsyncStorage.getItem('@indi:user');
      console.log('AuthContext: Stored user:', storedUser ? 'Found' : 'Not found');
      
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      const existingDb = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      if (!existingDb) {
        console.log('AuthContext: Initializing mock database');
        await AsyncStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(MOCK_USERS));
      }

      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
      console.log('AuthContext: Biometric available:', compatible && enrolled);
    } catch (error) {
      console.error('AuthContext: Initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedPassword = (password || "").trim();
    
    console.log('🔵 LOGIN start:', normalizedEmail);
    console.log('🔵 LOGIN normalized email:', normalizedEmail);
    console.log('🔵 LOGIN password length:', normalizedPassword.length);
    
    try {
      console.log('🔵 Calling backend login...');
      const response = await trpcClient.users.login.mutate({ 
        email: normalizedEmail, 
        password: normalizedPassword 
      });
      console.log('🔵 LOGIN backend OK:', response?.user?.id);
      console.log('🔵 LOGIN backend user:', JSON.stringify(response.user, null, 2));
      
      const backendUser = response.user;
      
      const roleMap: Record<string, string> = {
        'admin': 'Admin',
        'sales': 'Vendas',
        'rental': 'Locação',
        'technical': 'Assistência Técnica',
        'parts': 'Peças',
      };
      
      const mappedUser: User = {
        id: backendUser.id,
        type: backendUser.roles.includes('admin') || backendUser.roles.length > 0 ? 'employee' : 'client',
        email: backendUser.email,
        fullName: backendUser.name,
        cpf: backendUser.cpf,
        birthDate: backendUser.birthDate,
        companyName: backendUser.companyName,
        cnpj: backendUser.cnpj,
        roles: backendUser.roles.map(r => roleMap[r] || r) as any,
        lgpdConsent: true,
        lgpdConsentDate: backendUser.createdAt.toISOString(),
        createdAt: backendUser.createdAt.toISOString(),
        updatedAt: backendUser.updatedAt.toISOString(),
      };
      
      console.log('🔵 LOGIN mapped user:', JSON.stringify(mappedUser, null, 2));
      console.log('🔵 LOGIN setUser call...');
      setUser(mappedUser);
      console.log('🔵 LOGIN setUser OK');
      
      console.log('🔵 LOGIN storage write...');
      await AsyncStorage.setItem('@indi:user', JSON.stringify(mappedUser));
      console.log('🔵 LOGIN storage OK');
      console.log('🔵 LOGIN return true');
      
      return true;
    } catch (error) {
      console.error('🔴 LOGIN error:', error);
      console.error('🔴 LOGIN error details:', JSON.stringify(error, null, 2));
      return false;
    }
  }, []);

  const loginWithBiometric = useCallback(async (): Promise<boolean> => {
    console.log('AuthContext: Biometric login attempt');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticar com biometria',
        fallbackLabel: 'Usar senha',
      });

      if (result.success) {
        const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('AuthContext: Biometric login error:', error);
      return false;
    }
  }, []);

  const register = useCallback(async (userData: Partial<User>, password: string): Promise<boolean> => {
    console.log('AuthContext: register called');
    try {
      const dbString = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: User[] = dbString ? JSON.parse(dbString) : [];

      const existingUser = users.find(u => u.email.toLowerCase() === userData.email?.toLowerCase());
      if (existingUser) {
        console.log('AuthContext: Email already exists');
        return false;
      }

      const newUser: User = {
        id: Date.now().toString(),
        type: 'client',
        email: userData.email || '',
        fullName: userData.fullName || '',
        phone: userData.phone,
        birthDate: userData.birthDate,
        cpf: userData.cpf,
        companyName: userData.companyName,
        cnpj: userData.cnpj,
        lgpdConsent: userData.lgpdConsent || false,
        lgpdConsentDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      users.push(newUser);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
      setUser(newUser);
      console.log('AuthContext: Registration successful');
      return true;
    } catch (error) {
      console.error('AuthContext: Registration error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('AuthContext: logout called');
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      setUser(null);
      console.log('AuthContext: Logout successful');
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
    }
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>): Promise<boolean> => {
    console.log('AuthContext: updateUser called');
    if (!user) return false;

    try {
      const updatedUser = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const dbString = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: User[] = dbString ? JSON.parse(dbString) : [];
      const userIndex = users.findIndex(u => u.id === user.id);

      if (userIndex >= 0) {
        users[userIndex] = updatedUser;
        await AsyncStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
      }

      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      setUser(updatedUser);
      console.log('AuthContext: User updated successfully');
      return true;
    } catch (error) {
      console.error('AuthContext: Update user error:', error);
      return false;
    }
  }, [user]);

  const toggleBiometric = useCallback(async () => {
    console.log('AuthContext: Toggle biometric');
  }, []);

  return useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    biometricAvailable,
    login,
    loginWithBiometric,
    register,
    logout,
    updateUser,
    toggleBiometric,
  }), [user, isLoading, biometricAvailable, login, loginWithBiometric, register, logout, updateUser, toggleBiometric]);
});
