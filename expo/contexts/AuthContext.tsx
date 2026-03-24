
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { dataGateway } from '@/lib/data-gateway';
import { useAppState } from './AppStateContext';
import type { User } from '@/types';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const { startOperation, endOperation, setError } = useAppState();
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      console.log('AuthContext: Initializing...');
      try {
        startOperation('initAuth', 'initial_loading');

        try {
          const seedResponse = await dataGateway.initializeSeeds();
          if (seedResponse.status === 'error') {
            console.error('AuthContext: Failed to initialize seeds:', seedResponse.errorMessage);
          }
        } catch (seedError) {
          console.error('AuthContext: initializeSeeds threw:', seedError);
        }

        try {
          const autoLoginResponse = await dataGateway.autoLogin();
          if (autoLoginResponse.status === 'ok') {
            setUser(autoLoginResponse.data);
            console.log('AuthContext: Auto-login successful:', autoLoginResponse.data?.id);
          } else {
            console.log('AuthContext: No auto-login, user will see login screen');
          }
        } catch (loginError) {
          console.error('AuthContext: autoLogin threw:', loginError);
        }
      } catch (error) {
        console.error('AuthContext: init failed:', error);
      } finally {
        setIsInitializing(false);
        endOperation();
      }
    };

    void init();
  }, [startOperation, endOperation]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    console.log('AuthContext: login called for', email);
    startOperation('login', 'processing_request');
    try {
      const response = await dataGateway.login(email, password);
      if (response.status === 'ok') {
        setUser(response.data);
        endOperation();
        return true;
      } else {
        setError({ ...response, module: 'auth' });
        endOperation();
        return false;
      }
    } catch (error) {
      console.error('AuthContext: login threw:', error);
      setError({ errorCode: 'LOGIN_ERROR', errorMessage: 'Erro ao fazer login', module: 'auth' });
      endOperation();
      return false;
    }
  }, [startOperation, endOperation, setError]);

  const register = useCallback(async (data: {
    email: string;
    password: string;
    name: string;
    cpf?: string;
    birthDate?: string;
    companyName?: string;
    cnpj?: string;
  }): Promise<boolean> => {
    console.log('AuthContext: register called');
    startOperation('register', 'processing_request');
    try {
      const response = await dataGateway.register(data);
      if (response.status === 'ok') {
        setUser(response.data);
        endOperation();
        return true;
      } else {
        setError({ ...response, module: 'auth' });
        endOperation();
        return false;
      }
    } catch (error) {
      console.error('AuthContext: register threw:', error);
      setError({ errorCode: 'REGISTER_ERROR', errorMessage: 'Erro ao criar conta', module: 'auth' });
      endOperation();
      return false;
    }
  }, [startOperation, endOperation, setError]);

  const logout = useCallback(async () => {
    console.log('AuthContext: logout called');
    startOperation('logout', 'processing_request');
    try {
      const response = await dataGateway.logout();
      if (response.status === 'ok') {
        setUser(null);
        endOperation();
      } else {
        setError({ ...response, module: 'auth' });
        endOperation();
      }
    } catch (error) {
      console.error('AuthContext: logout threw:', error);
      setUser(null);
      endOperation();
    }
  }, [startOperation, endOperation, setError]);

  const loginWithBiometric = useCallback(async () => false, []);
  const toggleBiometric = useCallback(async () => {}, []);

  const updateUser = useCallback(async (updates: Partial<User>): Promise<boolean> => {
    console.log('AuthContext: updateUser called');
    if (!user) return false;
    startOperation('updateUser', 'processing_request');
    try {
      const response = await dataGateway.updateProfile(user.id, updates);
      if (response.status === 'ok') {
        setUser(response.data);
        endOperation();
        return true;
      } else {
        setError({ ...response, module: 'auth' });
        endOperation();
        return false;
      }
    } catch (error) {
      console.error('AuthContext: updateUser threw:', error);
      setError({ errorCode: 'UPDATE_ERROR', errorMessage: 'Erro ao atualizar perfil', module: 'auth' });
      endOperation();
      return false;
    }
  }, [user, startOperation, endOperation, setError]);

  return useMemo(() => ({
    user,
    isLoading: isInitializing,
    isAuthenticated: !!user,
    biometricAvailable: false,
    login,
    loginWithBiometric,
    register,
    logout,
    updateUser,
    toggleBiometric,
  }), [user, isInitializing, login, loginWithBiometric, register, logout, updateUser, toggleBiometric]);
});
