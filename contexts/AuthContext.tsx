
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
      startOperation('initAuth', 'initial_loading');

      const seedResponse = await dataGateway.initializeSeeds();
      if (seedResponse.status === 'error') {
        console.error('AuthContext: Failed to initialize seeds:', seedResponse.errorMessage);
        setError({ ...seedResponse, module: 'auth' });
        setIsInitializing(false);
        endOperation();
        return;
      }

      const autoLoginResponse = await dataGateway.autoLogin();
      if (autoLoginResponse.status === 'ok') {
        setUser(autoLoginResponse.data);
        console.log('AuthContext: Auto-login successful:', autoLoginResponse.data?.id);
      } else {
        console.error('AuthContext: Auto-login failed:', autoLoginResponse.errorMessage);
        setError({ ...autoLoginResponse, module: 'auth' });
      }

      setIsInitializing(false);
      endOperation();
    };

    init();
  }, [startOperation, endOperation, setError]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    console.log('AuthContext: login called');
    startOperation('login', 'processing_request');

    const response = await dataGateway.login(email, password);

    if (response.status === 'ok') {
      setUser(response.data);
      endOperation();
      return true;
    } else {
      setError({ ...response, module: 'auth' });
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

    const response = await dataGateway.register(data);

    if (response.status === 'ok') {
      setUser(response.data);
      endOperation();
      return true;
    } else {
      setError({ ...response, module: 'auth' });
      return false;
    }
  }, [startOperation, endOperation, setError]);

  const logout = useCallback(async () => {
    console.log('AuthContext: logout called');
    startOperation('logout', 'processing_request');

    const response = await dataGateway.logout();

    if (response.status === 'ok') {
      setUser(null);
      endOperation();
    } else {
      setError({ ...response, module: 'auth' });
    }
  }, [startOperation, endOperation, setError]);

  const updateUser = useCallback(async (updates: Partial<User>): Promise<boolean> => {
    console.log('AuthContext: updateUser called');
    if (!user) return false;

    startOperation('updateUser', 'processing_request');

    const response = await dataGateway.updateProfile(user.id, updates);

    if (response.status === 'ok') {
      setUser(response.data);
      endOperation();
      return true;
    } else {
      setError({ ...response, module: 'auth' });
      return false;
    }
  }, [user, startOperation, endOperation, setError]);

  return useMemo(() => ({
    user,
    isLoading: isInitializing,
    isAuthenticated: !!user,
    biometricAvailable: false,
    login,
    loginWithBiometric: async () => false,
    register,
    logout,
    updateUser,
    toggleBiometric: async () => {},
  }), [user, isInitializing, login, register, logout, updateUser]);
});
